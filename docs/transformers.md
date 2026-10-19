# Stencil v5 transformer catalogue (stenciljs/core v5, 5.0.0-beta.25), for a Rust/oxc port

Mapped on 2026-10-14 from `stenciljs/core` branch `v5` (5.0.0-beta.25, commit `8edd9838`). Root: `../stencil-core-v5/packages/core/src/compiler/transformers/`. Paths are relative to that root unless they start with `compiler/` (`packages/core/src/compiler/`) or `src/` (`packages/core/src/`). Non-test total: 13,711 lines. Companion: [pipeline.md](pipeline.md).

## 0. Key findings

1. **The output-target transformers never touch the TypeChecker, by construction.** Native/standalone, lazy, SSR, the collection output and the app-data global script all run inside `ts.transpileModule(mod.staticSourceFileText, { transformers: { before: customBeforeTransformers } })` (`compiler/bundle/typescript-plugin.ts:86-91`, `compiler/output-targets/collection/index.ts:75-82`, `compiler/bundle/app-data-plugin.ts:124-128`). `transpileModule` gives user transformers no type information. They read only the AST and the `compilerCtx.moduleMap` metadata, so they port straight to oxc.
2. **Every checker dependency sits in `decorators-to-static/*` and `transform-utils.ts`/`type-library.ts`, plus four small spots in static-to-meta.** Those four are: component docs, vdom string resolution, functional-component dependency resolution, and the `extends` symbol lookup. All four already have checker-free fallbacks.
3. **Only a handful of checker results reach the runtime JS:**
   - the prop `type` classification (`string|number|boolean|any|unknown`, `prop-decorator.ts:121-122,275-302`). It becomes `MEMBER_FLAGS` and decides whether an attribute is observed (`prop-decorator.ts:144-156`; `src/utils/format-component-runtime-meta.ts:200-215`; runtime `src/runtime/parse-property-value.ts:29-63`);
   - literal evaluation of computed member names and decorator arguments (`@Watch(CONST)`, `@Listen(Enum.X)`, `resolveVar()`);
   - `extends` resolution;
   - functional-component dependencies, which feed BUILD flags (`compiler/app-core/app-data.ts:154`).

   Everything else the checker produces is `complexType`, docs, `defaultValue`, the type library, or diagnostics. Those feed `components.d.ts`, docs-json, CEM and the collection output only (consumers: `compiler/types/*`, `compiler/docs/*`, `compiler/css-components/*`).
4. **Stencil already ships a degraded-checker mode.** The `transpile()` API (`compiler/transpile/transpile-module.ts:105-133`) builds a one-file `ts.Program` whose host serves only that file, with no lib (`readFile: () => ''`). Imported types therefore resolve to error/`any`. The test "unresolved type" expects `type: 'any'` (`_test_/parse-props.spec.ts:516-551`). The class-extension code also runs `convertDecoratorsToStatic` in throwaway `noLib/noResolve` mini-programs (`static-to-meta/class-extension/compiler-ctx-merge.ts:50-79`, `resolve-import-merge.ts:42-91`). A syntactic oxc implementation that matches or beats single-file-program behaviour is therefore a legitimate parity target. Fall back to `any`, never to `unknown`: `unknown` drops the attribute.

## 1. Pipeline composition and order (quoted)

**A. Full build (`compiler/transpile/run-program.ts`)**
```ts
// :132-137
const transformers: ts.CustomTransformers = {
  before: [
    convertDecoratorsToStatic(config, buildCtx.diagnostics, tsTypeChecker, tsProgram),
    performAutomaticKeyInsertion,
  ],
  afterDeclarations: [],
};
// :155  if (config.transformAliasedImportPaths) transformers.afterDeclarations.push(rewriteAliasedDTSImportPaths);
// :159  tsBuilder.emit(undefined, emitCallback, undefined, false, transformers);
```
- static-to-meta is not a transformer here. It runs inside the emit callback, `updateModule(config, compilerCtx, buildCtx, tsSourceFiles[0], data, emitFilePath, tsTypeChecker, null)` (`run-program.ts:107-116`).
- `tsSourceFiles[0]` is the post-transform SourceFile: TS stripped, JSX already turned into `h()`. `data` is the emitted JS, stored as `staticSourceFileText`, and every output target later re-parses that text.

**B. Stateless `transpile()` API (`compiler/transpile/transpile-module.ts:135-174`)**
```ts
before: [convertDecoratorsToStatic(...), performAutomaticKeyInsertion, updateStencilCoreImports(transformOpts.coreImportPath)],
after:  [convertStaticToMeta(config, compilerCtx, buildCtx, typeChecker, null, transformOpts)],
// :149 before.push(rewriteAliasedSourceFileImportPaths)   (if transformAliasedImportPaths)
// :162 afterDeclarations.push(rewriteAliasedDTSImportPaths)
// :169 after.push(nativeComponentTransform(...))  if componentExport === 'customelement' | 'module'
// :171 else after.push(lazyComponentTransform(...))
```

**C. Output targets (each runs `ts.transpileModule(staticSourceFileText, { before })`)**
- **standalone / component-native** (`compiler/output-targets/standalone/index.ts:432-447`):
  `addDefineCustomElementFunctions` → `updateStencilCoreImports` → [`rewriteAliasedSourceFileImportPaths`] → [`addTagTransform` if `compat.additionalTagTransformers`] → `nativeComponentTransform` → `proxyCustomElement` → `removeCollectionImports`.
  The options are `componentExport: null, proxy: null, style: 'static'`, so `define-custom-element.ts` and `addModuleMetadataProxies` are not used here.
- **lazy / loader-bundle** (`compiler/output-targets/dist-lazy/lazy-output.ts:201-214`): `updateStencilCoreImports` → [rewrite] → [addTagTransform] → `lazyComponentTransform` → `removeCollectionImports`.
- **SSR** (`compiler/output-targets/ssr/bundle-ssr-factory.ts:80-93`): `updateStencilCoreImports` → [rewrite] → [addTagTransform] → `ssrComponentTransform` → `removeCollectionImports`.
- **collection output** (`compiler/output-targets/collection/index.ts:75-82`): `after: [mapImportsToPathAliases(config, filePath, target)]`.
- **app-data global script** (`compiler/bundle/app-data-plugin.ts:124-128`): `after: [removeCollectionImports(compilerCtx)]`.
- **collection ingestion** (node_modules collections): `ts.createSourceFile(..., ScriptKind.JS)`, then `updateModule(..., typeChecker = undefined, collection)` (`collection/parse-collection-components.ts:39-56`). static-to-meta already runs with no checker at all here.

**Port notes on phase timing**
- decorators-to-static and key insertion run before TS's own lowering, so they see TS types, JSX and real class fields.
- static-to-meta (and every output transform) runs on emitted JS: `h()`/`jsx()` calls, and class fields lowered into the constructor when the target is below ES2022.
- On oxc, either run the meta-gathering after the JSX transform (simplest parity, since vdom detection keys on `h`/`jsx` calls; `static-to-meta/call-expression.ts:56-70`), or rewrite it to walk JSX nodes directly.

## 2. Catalogue

### decorators-to-static (full build `before[0]`; transpile() `before[0]`; also mini-programs in class-extension)

#### 2.1 `decorators-to-static/convert-decorators.ts` (360) — orchestrator
- **Entry:** `convertDecoratorsToStatic(config, diagnostics, typeChecker, program, includeClassExpressions = false): ts.TransformerFactory<ts.SourceFile>` (:39). Per-class worker: `visitClassDeclaration` (:87).
- **Input → output:**
  - Matches a `ClassDeclaration` (or a `ClassExpression` when `includeClassExpressions`) with `@Component` and/or decorated members (:97-107).
  - Strips the Stencil member decorators (`removeStencilMethodDecorators` :266, list in `decorators-constants.ts` `MEMBER_DECORATORS_TO_REMOVE`) and the `@Component` class decorator (:222-228).
  - Calls the per-decorator converters in a fixed order (:118-210): Component, PropSerialize, AttrDeserialize, Prop, State, Event, Method, Element, Watch, Listen, AttachInternals. Each pushes `static get X() { return <literal>; }` members.
  - `updateConstructor` (`transform-utils.ts:1375`) adds `constructor(){ super(); }` when the class extends something and has no constructor.
  - Decorated fields are kept (minus decorators). TS later lowers their initializers into the constructor for targets below ES2022, which is why specs show `this.val = ...` in the constructor.
  - A decorated set accessor raises "A get accessor should be decorated before a set accessor" (:300-303).
- **Checker:** passes the checker/program down only. Its own logic is syntactic. `ImportAliasMap` (`import-alias-map.ts`) resolves `import { Prop as P } from '@stencil/core'` from the module specifier text (`import-alias-map.ts:21`, `moduleSpecifier.getText().includes('@stencil/core')`).
- **Meta:** none (pure AST rewrite).
- **Port:** medium. Class-member surgery, constructor/super synthesis, and keeping TS class-field semantics under `useDefineForClassFields`.

#### 2.2 `component-decorator.ts` (356) + `style-to-static.ts` (126) — `@Component`
- **Entry:** `componentDecoratorToStatic` (:62); `styleToStatic` (style-to-static.ts:8).
- **Input → output:**
  - Options are evaluated by `getDecoratorParameters` (:70), which turns the object literal into a JS map (`transform-utils.ts:295`). Identifiers become `{__identifier, __escapedText}` placeholders, not values; only `resolveVar()` is evaluated.
  - Rejects the removed v4 keys `shadow`/`scoped`/`formAssociated` (:159-198).
  - Validates: encapsulation/slotAssignment/mode/patches (:225-258), config modes (:261), no constructor arguments (:269), no other class decorators (:279), tag present and valid (:288-302).
  - Emits `static get is()` (:97), `encapsulation`, `shadowMode`, `delegatesFocus`, `slotAssignment`, `clonable`, `serializable`, `patches` (:100-138), `assetsDirs` (:145).
  - Style getters: `originalStyleUrls`, `styleUrls` with the extension normalised to `.css` (style-to-static.ts:36-42, `useCss` :103), `originalGlobalStyleUrl`, `globalStyle`, and `styles` as a string, an identifier, or a per-mode object (:44-92).
- **Example:** `@Component({tag:'cmp-a'})` → `static get is() { return "cmp-a"; }` (`_test_/convert-decorators.spec.ts:24-27`).
- **Checker:**
  - `typeChecker.getExportsOfModule(typeChecker.getSymbolAtLocation(cmpNode.getSourceFile()))` (:305-313), filtered by `SymbolFlags.Interface|TypeAlias|Enum`. This enforces the "a component module may only export the class" rule. It is diagnostic only and skipped when `_isTesting`.
  - Indirectly, `resolveVar()` evaluation (see 2.10).
- **Meta:** none directly; the getters are read back later by static-to-meta.
- **Port:** easy. Export validation becomes an oxc `ModuleRecord` export scan; the options are literal evaluation.

#### 2.3 `prop-decorator.ts` (671) — `@Prop` (the hardest)
- **Entry:** `propDecoratorsToStatic` (:35) → `parsePropDecorator` (:84).
- **Input → output:** a property or get accessor with `@Prop(opts?)` becomes a property assignment in `static get properties()`. The value is `{type, mutable, complexType{original,resolved,references}, required (!), optional (?), docs, getter, setter, [ogPropName], [reflect], [attribute], [defaultValue]}` (:125-185).
  - `reflect`/`attribute` are only set when `type !== 'unknown'` (or a serializer/deserializer exists) (:144-156).
  - `attribute` = `toDashCase(name)` or `opts.attribute` lowercased; `null` means no attribute (:201-211).
  - `reflectToAttr` raises a rename error (:229-235).
  - Warnings for `on*` names and reserved public names (:112-118, `reserved-public-members.ts:18`); an error for private/protected (:105-110).
- **Example** (`_test_/convert-decorators.spec.ts:9-45`): `@Prop() val: string = "initial value";` →
  `static get properties() { return { "val": { "type": "string", "mutable": false, "complexType": {"original":"string","resolved":"string","references":{}}, "required": false, "optional": false, "docs": {"tags":[],"text":""}, "getter": false, "setter": false, "reflect": false, attribute: 'val', "defaultValue": "\"initial value\"" } }; }`.
  - Enum example (`parse-props.spec.ts:59-94`): `@Prop() val: Mode` with `enum Mode {DEFAULT='default'}` gives `type:'string'` and references `{Mode:{location:'local',path:'module.tsx',id:'module.tsx::Mode'}}`.
  - `@Prop() val = null` gives `type:'unknown'` and no attribute (:977-1009).
  - An unresolved `Foo` gives `type:'any'` and `references {Foo: global::Foo}` (:516-551).
- **Checker (heavy):**
  - **Runtime type (runtime-critical):** `getTypeAtLocation(prop)` (:121; and :179 for the getter fallback). `propTypeFromTSType` (:275) inspects `Type.flags` (Any; String|StringLike|StringLiteral; Number|NumberLike|NumberLiteral; Boolean|BooleanLike) and recurses into `UnionType.types` (:313-376). A mix of primitives gives `any`; nothing matching gives `unknown`.
  - **Name:** `tsPropDeclName` → `getTypeAtLocation(computedName.expression)` with `isLiteral()` (`transform-utils.ts:1497-1532`) for `[MyEnum.X]` / `[constVar]` names.
  - **complexType:** `getComplexType` (:239) uses `typeToString` (`transform-utils.ts:985`, flags `NoTruncation|InTypeAlias|InElementType`), `resolveType` (`transform-utils.ts:947`, `getTypeFromTypeNode`, `isArrayType`, `getTypeArguments`, `aliasSymbol`/`aliasTypeArguments`, `getTypeAtLocation(aliasDecl)`), `typeChecker.typeToTypeNode(type)` for inferred types (:259), and `getAttributeTypeInfo` (see 2.12).
  - **Docs:** `getSymbolAtLocation(prop.name)` + `serializeSymbol` (`getJsDocTags`, `getDocumentationComment`) (:120, :131).
  - **defaultValue:** const-chain following via `getSymbolAtLocation`, `getAliasedSymbol` (:577, :594), `getShorthandAssignmentValueSymbol` (:647). It is bounded by `MAX_RESOLVE_DEPTH=5` (:417) and goes cross-file through imports. Docs/types only.
- **Meta:** none directly; parsed back by `static-to-meta/props.ts`.
- **Port:** hard. The runtime `type` needs a type classifier; `complexType` needs real type printing.
  - A syntactic classifier covers keywords, literal types, unions, `T[]`, and local (oxc_semantic) plus one-hop imported `type`/`enum` declarations, plus initializer-literal inference.
  - Fall back to `any`. That equals the `transpile()` behaviour; the edge cases are things like imported numeric aliases, which end up `any` instead of `number`.

#### 2.4 `state-decorator.ts` (73) — `@State`
- **Entry:** `stateDecoratorsToStatic` (:23).
- **Output:** `static get states() { return { "count": {} } }`, with `ogPropName` for computed names (:55-72). Spec: `_test_/convert-decorators.spec.ts:105-128`.
- **Checker:** only `tsPropDeclName` (computed-name literal evaluation).
- **Port:** easy.

#### 2.5 `event-decorator.ts` (453) — `@Event`
- **Entry:** `eventDecoratorsToStatic` (:15) → `parseEventDecorator` (:49).
- **Output:** `static get events() { return [{method, name, bubbles=true, cancelable=true, composed=true, docs, complexType}] }`. The event type comes from the syntactic `EventEmitter<T>` type argument (`getEventType` :132); it is `'any'` when there is no annotation.
- **Validation:** capitalised names, `on[A-Z]` names, and DOM-name clashes (`DOM_EVENT_NAMES` :191) all warn (:156-189).
- **Example** (`_test_/parse-events.spec.ts:8-40`): `@Event() thingChanged: EventEmitter<string>` with JSDoc → `{name:'thingChanged', method:'thingChanged', bubbles:true, cancelable:true, composed:true, complexType:{original:'string',resolved:'string',references:{}}, docs:{text:'Hello, this is an event', tags:[{name:'foo',text:'bar'}]}}`.
- **Checker:** `getSymbolAtLocation(prop.name)` for docs (:73); `getTypeFromTypeNode(eventType)` plus `resolveType` (:120); `getAttributeTypeInfo` (:122).
- **Runtime:** the runtime only uses name, method and flags (`create-event.ts:51-63`), all syntactic.
- **Port:** easy for runtime fields; `complexType` is hard (types/docs only).

#### 2.6 `method-decorator.ts` (154) — `@Method`
- **Entry:** `methodDecoratorsToStatic` (:18) → `parseMethodDecorator` (:51); `validateMethods` (:142) is a syntactic `componentDidUnload` check.
- **Output:** `static get methods() { return { name: { complexType:{signature, parameters[{name,type,docs}], references, return}, docs:{text,tags} } } }`.
- **Validation:** a non-Promise return warns or errors unless `_isTesting` (:82-97); private/protected errors (:99-104).
- **Example** (`_test_/parse-methods.spec.ts:8-58`): `someMethod(foo: string, bar: number)` → `signature '(foo: string, bar: number) => void'`, parameter types `string`/`number`, docs from `@param` tags.
- **Checker:**
  - `getSignatureFromDeclaration` (:67), `getReturnTypeOfSignature` (:68), `typeToTypeNode(returnType, method, NodeBuilderFlags.NoTruncation|NoTypeReduction)` (:69), `typeToString` (:74).
  - `signatureToString(signature, method, WriteArrowStyleSignature|NoTruncation, SignatureKind.Call)` (:75).
  - `getTypeOfSymbolAtLocation(param, method)` (:114), `symbol.getDocumentationComment` (:115), `signature.getDocumentationComment` / `getJsDocTags` (:125-126), `getAttributeTypeInfo` ×2 (:118-119).
- **Runtime:** only the method name matters (`MEMBER_FLAGS.Method`).
- **Port:** easy for runtime. Signatures and the Promise check are hard; approximate with a syntactic `async`/`Promise<>` annotation check.

#### 2.7 `element-decorator.ts` (40) — `@Element`
- **Entry:** `elementDecoratorsToStatic` (:8).
- **Output:** `static get elementRef() { return "el"; }`. More than one `@Element` raises an error (:23-26).
- **Checker:** none.
- **Port:** easy.

#### 2.8 `watch-decorator.ts` (55), `listen-decorator.ts` (118), `serialize-decorators.ts` (69) — handler decorators
- **Entries:** `watchDecoratorsToStatic` (watch :12), `listenDecoratorsToStatic` (listen :12), `serializeDecoratorsToStatic` (serialize :11; called twice, for `PropSerialize` → `serializers` and `AttrDeserialize` → `deserializers`).
- **Output:**
  - `static get watchers() { return [{propName, methodName, handlerOptions?}] }`.
  - `static get listeners() { return [{name, method, target, capture=false, passive}] }`. `passive` defaults to true for a fixed event list (`PASSIVE_TRUE_DEFAULTS` listen :85). Comma-separated names and `target:'parent'` raise errors (listen :50-64).
  - `static get serializers()` / `deserializers()`: `[{propName, methodName}]`, only for names that match an `@Prop` (serialize :43-53).
- **Checker:** `getDecoratorParameters`. String literals are syntactic; `Identifier`/`PropertyAccessExpression` arguments go through `getTypeAtLocation(arg).isLiteral()` → `.value` (`decorator-utils.ts:54-64`). Serialize also uses `tsPropDeclName`.
- **Port:** easy (medium if `@Watch(ENUM.X)` must keep working; needs in-file plus import const/enum evaluation).

#### 2.9 `attach-internals.ts` (208) — `@AttachInternals`
- **Entry:** `attachInternalsDecoratorsToStatic` (:38).
- **Output:** `static get attachInternalsMemberName()`, optional `attachInternalsCustomStates()` (`[{name, initialValue, docs}]`), and `formAssociated()` (`true` unless `formAssociated:false`) (:72-85, :95-127). More than one raises an error (:57-60).
- **Checker:** `getSymbolAtLocation(prop.name)` + `getDocumentationComment` to read JSDoc on each `states` key (:197-198); `tsPropDeclName`.
- **Port:** easy (JSDoc from oxc comments).

#### 2.10 `decorator-utils.ts` (254), `import-alias-map.ts` (42), `decorators-constants.ts` (83) — support
- `getDecoratorParameters` (decorator-utils :7) / `getDecoratorParameter` (:20):
  - object literal → `objectLiteralToObjectMap`; string → text; identifier or property access → `getTypeAtLocation(arg)` literal value (:55); anything else throws `invalid decorator argument`.
  - `resolveVar(x)` → `resolveVariableValue` (:79): `getSymbolAtLocation` (:87), `getAliasedSymbol` across imports (:90), `getTypeAtLocation` (:106, :130), `getPropertyOfType` (:141), `getTypeOfSymbolAtLocation` (:152), and initializer extraction (`extractStringFromExpression` :204, `getTypeAtLocation` :219).
  - The same logic is duplicated in `transform-utils.ts:403-516` for `resolveVar` nested in object literals.
- `isDecoratorNamed` (:236): matches by `dec.expression.expression.getText() === name`. Syntactic; a namespaced `@core.Prop()` will not match.
- The constants file holds the decorator lists and the `STATIC_GETTER_NAMES` union.
- **Port:** medium. Needs a small const evaluator (in-file via oxc_semantic, plus cross-file via resolver and re-parse).

#### 2.11 `reserved-public-members.ts` (298) — validation helper
- `validatePublicName` (:18) checks a name against hard-coded HTMLElement/Node/JSX member lists. Purely syntactic.
- **Port:** easy.

#### 2.12 Type-resolution core: `transform-utils.ts` (1671; type section ~:555-1060) + `type-library.ts` (366)
- **Entries:** `getAttributeTypeInfo` (:555), `resolveType` (:947), `typeToString` (:985), `parseDocsType` (:1006), `serializeSymbol` (:1171), `resolveAliasedSymbol` (:596); type-library `addToLibrary` (:26), `addFileToLibrary` (:79), `getHomeModule` (:190), `getOriginalTypeName` (:238).
- **What it does:** walks `TypeReference` nodes and `typeof X` queries (`getAllTypeReferences` :609). Each reference is classified as `import`/`local`/`global` with a path and a stable id `relpath::Name`, by scanning the file's import/export statements (`getTypeReferenceLocation` :685-940). The resolved declaration's text and docstring go into a process-global `TYPE_LIBRARY` (type-library.ts:13) for docs-json.
- **Checker:**
  - `getTypeFromTypeNode` (:624, :637, :953), `getSymbolAtLocation` (:645, :736, :876), `getAliasedSymbol`, `getTypeAtLocation` (:654, :747, :1039).
  - `getTypeOfSymbolAtLocation` (:743, :882), `isArrayType` (:1011), `getTypeArguments` (:1012), `typeToString` (:991).
  - `program.getCompilerOptions` (:713), `ts.createCompilerHost` (:714), `ts.resolveModuleName` and `program.getSourceFile` (type-library:197, :203).
  - `type.isTypeParameter` (type-library:44), `type.symbol` / `aliasSymbol` `.declarations[0].getText()` (:300-311), `symbol.getDocumentationComment` (:325).
  - `addFileToLibrary` builds its own `ts.createProgram` (:85).
- **Meta:** writes `complexType.references`; the type library is consumed by `compiler/docs/generate-doc-data.ts`.
- **Port:** hard. This is the part that genuinely needs a type system: tsgo sidecar, or redesign it as a separate types/docs pass outside the JS hot path.

#### 2.13 Other `transform-utils.ts` pieces (syntactic)
- `convertValueToLiteral` (:53): serialises a JS value to an AST. Keys starting with `_` are dropped (:156), which is how `complexType._astNode` disappears. `String`/`Number`/`Boolean` and `{__identifier}` become identifiers.
- `createStaticGetter` (:170), `getStaticValue` (:190, literal → JS value round trip), `objectLiteralToObjectMap` (:295).
- `getComponentTagName` (:1136, requires a `-` in the tag), `isStaticGetter` (:1154), `getComponentMeta` (:1089, `nodeMap` by node identity, then fallback by `is` getter tag).
- `createImportStatement` / `createRequireStatement` (:1214, :1255), `updateConstructor` (:1375), `needsSuper` (:1456).
- `addTagTransformToCssString` / `addTagTransformToCssTsAST` (:1578, :1606): uses postcss, postcss-selector-parser and postcss-safe-parser.
- **Port:** easy to medium. The CSS selector rewriting needs a Rust CSS parser such as lightningcss/cssparser.

### automatic-key-insertion (full build and transpile() `before[1]`)

#### 2.14 `automatic-key-insertion/index.ts` (265) + `utils.ts` (23)
- **Entry:** `performAutomaticKeyInsertion(transformCtx)` (:40).
- **Input → output:** inside classes that have an `is` getter (so it must run after decorators-to-static, :52-65), in a `render()` method with exactly one `return` (:103-109), add `key="<base36 counter>"` to every JSX opening or self-closing element.
  - It does not descend into call expressions or ternaries (:122-138) and skips elements that already have a `key` (:198-201).
  - The counter is reset per render (utils.ts:9, :21).
- **Example** (`automatic-key-insertion/_test_/automatic-key-insertion.spec.ts`, key mocked): `return <div>test</div>` → `h('div', { key: 'test-key' }, 'test')`.
- **Checker:** none.
- **Meta:** none.
- **Port:** easy. Must run before the oxc JSX transform.

### static-to-meta (full build: emit-callback walker; transpile(): `after[0]`; collections: no checker)

#### 2.15 `static-to-meta/visitor.ts` (71) + `parse-static.ts` (184) — entry points
- **Entries:** `convertStaticToMeta(...)`, a `TransformerFactory` (visitor :11); `updateModule(...)`, a plain recursive walker, not a transformer (parse-static :82).
- **What they do:**
  - Classes go to `parseStaticComponentMeta`; imports to `parseModuleImport`; call expressions to `parseCallExpression`; string literals to `parseStringLiteral`.
  - `updateModule` also detects "exportable mixins" (static getters but no tag; :52-64, :125-160).
  - It caches by text equality (:94-96) and stores a JS-mode re-parse as `staticSourceFile` (:170-179).
- **Meta written:** a `d.Module` in `compilerCtx.moduleMap` (`cmps`, `originalImports`, `localImports`, `isCollectionDependency`, `collectionName`, `hasExportableMixins`, `staticSourceFile(Text)`), plus `compilerCtx.changedModules` and `nodeMap`.
- **Checker:** passes it through only. It is `undefined` for collection modules.
- **Port:** easy.

#### 2.16 `static-to-meta/component.ts` (363) — `parseStaticComponentMeta` (:72)
- **What it does:** requires static getters plus a tag (:83-87).
  - Merges inherited members via `mergeExtendedClassMeta` or, in the transpile path, `mergeExtendedClassMetaWithResolveImport` (:100-116).
  - Builds a full `ComponentCompilerMeta` (:121-228) from the member parsers.
  - Walks the class for `h()` calls and string literals (:234-242), then `parseClassMethods` (lifecycle `has*Fn` flags, `class-methods.ts`).
  - Sets `hasModernPropertyDecls` (`detect-modern-prop-decls.ts:32`, or `doesExtend`) and `setComponentBuildConditionals` (`component-build-conditionals.ts:5`).
  - Forces `isPlain=false` when the class extends something (:254-259).
  - When `componentMetadata === 'compilerstatic'`, appends `static get COMPILER_META()` (`add-component-meta-static.ts:16`).
  - Warns on a `shadowRoot` getter and on multi-argument `componentShouldUpdate` (:283-315).
  - Parses `@virtualProp` tags (:317-335) and `assetsDirs` (:337-362).
- **Checker:** `typeChecker.getSymbolAtLocation(cmpNode.name)` + `serializeSymbol` for component docs (:117-118). These drive `docs`, `virtualProperties` and `internal` (docs/types only).
- **Meta written:** essentially every `ComponentCompilerMeta` field (tag, encapsulation and shadow flags, properties/states/methods/listeners/events/watchers/serializers, styles, assetsDirs, every `has*`/`isPlain`/`isUpdateable`, `htmlTagNames`/`AttrNames`/`Parts`/`Slots`, `potentialCmpRefs`).
- **Parity gotcha (verified):** `hasElement` is initialised `false` (:174) and never set anywhere in `src/`; it is read only in `component-build-conditionals.ts:51` and `compiler/app-core/app-data.ts:33`.
- **Port:** easy to medium. JSDoc via oxc comments. A Rust port can build this struct straight from decorators, skipping the static-getter round trip for local sources.

#### 2.17 Member parsers (syntactic readers of static getters)
- Files: `props.ts` (49), `states.ts` (22), `events.ts` (24), `methods.ts` (30), `listeners.ts` (23), `watchers.ts` (24), `serializers.ts` (24), `element-ref.ts` (13), `form-associated.ts` (14), `attach-internals.ts` (45), `encapsulation.ts` (166), `styles.ts` (125), `class-methods.ts` (24).
- **What they do:** `getStaticValue(staticMembers, '<getter>')` to JS, then normalisation.
  - `styles.ts` uses `styleUrls` for collection deps and `originalStyleUrls` otherwise (:17). It then calls `normalizeStyles` (`compiler/style/normalize-styles.ts`) and adds mode names to `compilerCtx.styleModeNames`.
- **Checker:** none.
- **Port:** easy. Still required to read node_modules collection JS, which is in static-getter form.

#### 2.18 `call-expression.ts` (148), `vdom.ts` (133), `string-literal.ts` (16) — vdom and HTML metadata
- **Entries:** `parseCallExpression` (call-expression :8), `gatherVdomMeta` (vdom :28), `parseStringLiteral` (string-literal :4).
- **What they do:**
  - `h()`/`__stencil_h`/`createElement`/`jsx`/`jsxs`/`_jsx`/`_jsxs`/`createElementNS` record `htmlTagNames` and `potentialCmpRefs` (dashed tags).
  - They set `hasVdom{Render,Functional,Attribute,Class,Key,Listener,PropOrAttr,PropOrAttrPrefix,Ref,Style,Xlink,Text}`, `htmlAttrNames`, `htmlParts`, `htmlSlots` (vdom :28-133), and record `require()` paths.
  - Strings containing `</`+`<slot`/`<svg` add tag names.
- **Checker:**
  - `resolveStaticStringValue` → `getTypeAtLocation(expr).isStringLiteral()` for `part={CONST}` / `<slot name={CONST}>` (vdom :12-25). Docs and css-components only.
  - Functional-component dependencies: `getSymbolAtLocation(identifier)` + `getAliasedSymbol` + `declarations[0].getSourceFile()` (call-expression :114-148), and the zero-argument `this.renderX()` case (`typeChecker?.getSymbolAtLocation` :27-44). These write `Module.functionalComponentDeps`, which feeds BUILD conditionals (`compiler/app-core/app-data.ts:154`).
  - All checker calls are optional-guarded.
- **Port:** easy. Functional dependencies are medium: map identifier → import binding (oxc_semantic) → resolve specifier.

#### 2.19 `import.ts` (57) + `collection/add-external-import.ts` (188)
- **Entries:** `parseModuleImport` (import :8), `addExternalImport` (add-external-import :135).
- **What they do:**
  - Push `originalImports`; flag `hasSignalsImport` for `@stencil/core/signals` (:24).
  - Relative or absolute specifiers go to `localImports` (joined, normalised).
  - Bare specifiers are resolved through `tsResolveModuleNamePackageJsonPath` (outside this dir) to find Stencil collections, ingested via `parseCollection` (`collection/parse-collection-module.ts:7`).
- **Checker:** none (TS module resolution only).
- **Port:** medium (oxc_resolver plus package.json `collection` handling).

#### 2.20 `static-to-meta/class-extension/` (1,921: `compiler-ctx-merge.ts` 656, `resolve-import-merge.ts` 531, `shared.ts` 518, `extract-inherited-meta.ts` 212, `index.ts` 4)
- **Entries:**
  - `mergeExtendedClassMeta` (compiler-ctx-merge :533) for the full build.
  - `mergeExtendedClassMetaWithResolveImport` (resolve-import-merge :465) for `transpile()`, driven by a caller `resolveImport(specifier, importer) → {code, path}` callback, with no Program.
  - `extractInheritedMeta` / `FromClass` (:73, :98), a parse-only fallback where every type comes back `any`.
- **What they do:**
  - Walk `extends X` and `extends Mixin(A, B)` (compiler-ctx-merge :307-319) recursively.
  - Find parents in the moduleMap's static source, or on disk via `tsGetSourceFile`. Disk sources get `convertDiskSourceFileDecorators` (:50-79): a throwaway `ts.createProgram` with `noLib/noResolve`, then `ts.transform` with `convertDecoratorsToStatic(..., includeClassExpressions = true)`, then print and re-parse.
  - Handle mixin factories (`findClassWalk`), one barrel hop (`findReExport`), `.d.ts` to collection `.js` mapping (`convertDtsToJs` :256-262), and package.json `exports` JS entries (`shared.ts:275-420`).
  - Merge props/states/methods/events/listeners/watchers/serializers with de-duplication (`deDupeMembers` shared :441). Type-reference paths are re-anchored to the child file (`reanchorInheritedTypeReferences` shared :478).
  - Set `Module.isMixin` / `isExtended` on the parent modules (:612-618). Warn when a parent with props/states doesn't use modern class fields (:621-630).
- **Checker:** happy path `typeChecker?.getSymbolAtLocation(extendee)` + `getAliasedSymbol` → `declarations[0].getSourceFile()` (:325-338). It throws into a fully syntactic "sad path" (:389-490) that matches same-file declarations and import bindings. The mini-programs call `program.getTypeChecker()` / `program.getSourceFile()` (:66-70; resolve-import-merge :68-72), but with `noLib/noResolve` they are effectively parse-only.
- **Meta:** returns the merged member arrays and `doesExtend`; writes `isMixin`/`isExtended` on other modules.
- **Port:** hard. Not because of types: the cross-file logic is intricate. `resolve-import-merge.ts` is already the checker-free template to port.

#### 2.21 `component-build-conditionals.ts` (84), `detect-modern-prop-decls.ts` (73), `add-component-meta-static.ts` (53)
- `setComponentBuildConditionals` (:5) derives `hasProp*`/`hasState`/`hasListener*`/`hasMember`/`isUpdateable`/`hasStyle`/`hasMode`/`hasLifecycle`/`isPlain`/`hasPatch*`.
- `detectModernPropDeclarations` (:32) checks whether prop/state names survive as class field declarations. It only works pre-lowering or at ES2022+; in a port, derive it from the target and `useDefineForClassFields` instead.
- `addComponentMetaStatic` (:16) emits `static get COMPILER_META()` (transpile `compilerstatic` mode).
- **Checker:** none.
- **Port:** easy.

### component-native = standalone output (custom elements)

#### 2.22 `component-native/tranform-to-native-component.ts` (122) + `native-component.ts` (216)
- **Entries:** `nativeComponentTransform(compilerCtx, transformOpts, buildCtx)` (tranform :57); `updateNativeComponentClass` (native-component :33), `updateNativeSuperClass` (:74), `updateNativeBaseClass` (:158).
- **Input → output:** for every component class (`getComponentMeta`):
  - Inject `extends HTMLElement` when there is no heritage clause, registering `HTMLElement` as an output-target runtime API (:117-141).
  - Strip the Stencil static getters (`remove-static-meta-properties.ts:14`, list :34-57).
  - Constructor, connectedCallback, element getter (2.23).
  - `static get watchers/serializers/deserializers()` as `{prop: [{method: flags}]}` (`reactive-handler-meta-transform.ts:18`, `WATCH_FLAGS.Immediate` :31).
  - `static get is()` for plain components only (`native-meta.ts:6`) and `static get style()` (2.24).
  - Rewrite `class X` → `const X = class extends HTMLElement {...}`, keeping `export` unless `customelement` mode (`update-component-class.ts:19-123`).
  - Non-component classes in an `isExtended` module get `super(false)` (`updateNativeSuperClass`). Classes with Stencil meta getters, or flagged `transformAsBaseClass`, get `updateNativeBaseClass`.
- **File-level steps:**
  - In `customelement` mode, `defineCustomElement` appends `customElements.define(__stencil_transformTag('tag'), X)` for plain components, else `__stencil_defineCustomElement(X, compactMeta)` (`define-custom-element.ts:13-70`). This path is transpile() only.
  - `proxy === 'defineproperty'` → `addModuleMetadataProxies` (`add-component-meta-proxy.ts:8`).
  - Then `updateStyleImports` (2.29), and `addImports` (`add-imports.ts:22`, prepends `import { a as __stencil_a, ... } from coreImportPath`).
- **Examples** (`_test_/native-component.spec.ts`):
  - Plain (:29-50): `@Component({tag:'cmp-a'}) export class CmpA {}` → `import { HTMLElement } from "@stencil/core"; const CmpA = class extends HTMLElement { static get is() { return 'cmp-a'; } }; customElements.define(__stencil_transformTag("cmp-a"), CmpA);`.
  - Extends chain (:52-102): `__stencil_defineCustomElement(CmpA, [512, 'cmp-a', { baz: [2], bar: [2], foo: [2] }])`, and `const CmpB = class extends PlainClass { constructor(registerHost) { super(false); if (registerHost !== false) { this.__registerHost(); } } bar; };`. The `[2]` is the prop-type member flag, so it comes from the checker.
- **Checker:** none.
- **Meta read:** `ComponentCompilerMeta` (`isPlain`, `encapsulation`, `events`, `elementRef`, `watchers`/`serializers`/`deserializers`, `styles`, `attachInternals*`, `doesExtend`, `hasRenderFn`); `Module.cmps`/`isExtended`/`isLegacy`.
- **Meta written:** `Module.coreRuntimeApis` / `outputTargetCoreRuntimeApis` (`core-runtime-apis.ts:35-64`), and `style.styleIdentifier` (mutated in `add-static-style.ts:192-206`).
- **Port:** easy to medium (lots of codegen, simple logic).

#### 2.23 Native member helpers
- `native-constructor.ts` (111), `updateNativeConstructor` (:24). Skipped for plain components. Adds a `registerHost` parameter, `if (registerHost !== false) { this.__registerHost(); }`, `this.__attachShadow();` when shadow (:55-110), `this.<ev> = __stencil_createEvent(this, 'name', flags)` (`create-event.ts:13-63`, `EVENT_FLAGS` Bubbles/Composed/Cancellable), and the attach-internals binding. `super(false)` when `doesExtend` (:47).
- `native-connected-callback.ts` (68). Plain components with `render` get `connectedCallback(){ this.textContent = this.render(); ... }` (:19-65).
- `native-element-getter.ts` (47). Replaces the `@Element` field with `get el() { return this; }`.
- `component-native/attach-internals.ts` (105). Emits `this.internals = this.attachInternals(); this.internals.states.add('open');` (:34-105).
- **Checker:** none.
- **Port:** easy.

#### 2.24 `component-native/native-static-style.ts` (127) (+ `add-static-style.ts` 260)
- **Entry:** `addNativeStaticStyle` (:10).
- **Output:** `static get style()` returns:
  - an inline template literal (pre-scoped via `scopeCss(styleStr, getScopeId(tag, mode))` when `scoped`, :115-127),
  - or the style-import identifier expression `CmpAStyle0()` / `CmpAStyle0() + CmpAStyle1()` (`createStyleIdentifier`, `add-static-style.ts:192-256`),
  - or a user-imported identifier,
  - or a `{mode: ...}` object for multiple modes (:29-73).
  - With `compat.additionalTagTransformers`, tag selectors become `${__stencil_transformTag("x")}` (`transform-utils.ts:1606`).
- **Checker:** none.
- **Port:** medium. `scopeCss` is ported (`stencilrs_transform::scope_css`, checked by `parity/scope-css.mjs`).

#### 2.25 `component-native/add-define-custom-element-function.ts` (340) — standalone `before[0]`
- **Entry:** `addDefineCustomElementFunctions(compilerCtx, components, outputTarget, devMode)` (:17).
- **Output:** appends imports of each dependency's `defineCustomElement as $DepDefineCustomElement` (:120-147), plus
  ```js
  export function defineCustomElement(opts) {
    const _storeReg = __stencil_getRegistry(); const _reg = opts?.registry ?? _storeReg;
    if (typeof _reg === "undefined") return;
    ['cmp-a', ...deps].forEach(tagName => { switch (tagName) {
      case 'cmp-a': if (!_reg.get(__stencil_transformTag(tagName))) { (CmpA._registry = _reg, _reg.define(__stencil_transformTag(tagName), CmpA)); } break;
      case 'dep-b': if (...) { $DepBDefineCustomElement(opts); } break; } });
  }
  ```
  (:89-110, :156-181, :209-325). Also an optional auto-define call (:47-49, :332-339) and, in dev mode, `CmpA.__stencil_module__ = import.meta.url` (:51-69).
  - Spec: `_test_/add-define-custom-element-function.spec.ts:47-80`.
- **Checker:** none.
- **Meta read:** `cmp.dependencies` (computed by the build after static-to-meta), `tagName`, `componentClassName`, `sourceFilePath`. Adds `transformTag` and `getRegistry` to `coreRuntimeApis`.
- **Port:** easy.

#### 2.26 `component-native/proxy-custom-element-function.ts` (127) — standalone, after native
- **Entry:** `proxyCustomElement(compilerCtx, transformOpts)` (:30).
- **Input → output:** finds the top-level `const <ClassName> = class ...` that native produced. It renames the class expression and wraps it: `/*@__PURE__*/ __stencil_proxyCustomElement(class CmpA extends HTMLElement {...}, <compact meta>)` (:43-120). The meta comes from `createClassMetadataProxy` → `formatComponentRuntimeMeta(cmp, true)` (`add-component-meta-proxy.ts:68-80`; `src/utils/format-component-runtime-meta.ts:20`, 288 lines, which encodes CMP_FLAGS, members with MEMBER_FLAGS, listeners, watchers, serializers).
  - Spec: `_test_/proxy-custom-element-function.spec.ts:78-87` (meta mocked to `true`).
- **Checker:** none.
- **Port:** easy, plus a medium port of `formatComponentRuntimeMeta` (outside the dir but mandatory).

### component-lazy = loader bundle

#### 2.27 `component-lazy/` (495: `transform-lazy-component.ts` 98, `lazy-component.ts` 76, `lazy-constructor.ts` 62, `lazy-element-getter.ts` 57, `attach-internals.ts` 197, `constants.ts` 5)
- **Entry:** `lazyComponentTransform` (transform-lazy-component :29).
- **Output:**
  - Strip static getters.
  - `constructor(hostRef) { __stencil_registerInstance(this, hostRef); this.x = __stencil_createEvent(...); ... }` (lazy-constructor :19-62).
  - `get el() { return __stencil_getElement(this); }` (lazy-element-getter :14-57).
  - Attach internals: `if (hostRef.$hostElement$["s-ei"]) { this.internals = hostRef.$hostElement$["s-ei"]; ... }` (attach-internals :46, :189).
  - Watcher/serializer getters; `const X = class {}` rewrite; style as a trailing statement `X.style = ...` (`add-static-style.ts:48-66`).
  - Mixin modules get `updateMixin` (`transform-utils.ts:1120`). In tests, top-level classes get their constructors tidied (:54-66).
  - Spec: `_test_/lazy-component.spec.ts` (`__stencil_registerInstance(this, hostRef)`; `get el() { return __stencil_getElement(this); }`).
- **Checker:** none.
- **Meta:** the same reads as native.
- **Port:** easy (reuses the native helpers).

### component-ssr

#### 2.28 `component-ssr/` (161: `tranform-to-ssr-component.ts` 60, `ssr-component.ts` 57, `ssr-runtime-cmp-meta.ts` 44)
- **Entry:** `ssrComponentTransform` (:20).
- **Output:** keeps the `class` declaration (no `const` rewrite, ssr-component :25-39). Lazy-style constructor and element getter, watcher getters, `static get style()`, and `static get cmpMeta()` = `{$flags$, $tagName$, $members$, $listeners$, $lazyBundleId$: '-', $attrsToReflect$: [[prop, attr]...]}` (ssr-runtime-cmp-meta :8-44).
- **Checker:** none.
- **Port:** easy.

### shared output-target transformers

#### 2.29 `style-imports.ts` (283) + `stencil-import-path.ts` (110)
- **Entries:** `updateStyleImports` (:36); `serializeImportPath` (stencil-import-path :20) and `parseImportPath` (:65).
- **Output:** after the last import, `import CmpAStyle0 from './cmp-a.css?tag=cmp-a&mode=ios&encapsulation=scoped'`, or `const X = require(...)` for CJS. Existing `import styles from './x.css'` identifiers get their path rewritten (:104-141).
- **Checker:** none.
- **Port:** easy.

#### 2.30 `update-stencil-core-import.ts` (132)
- **Entry:** `updateStencilCoreImports(coreImportPath)` (:9).
- **Output:**
  - `@stencil/core/jsx-runtime` and `jsx-dev-runtime` imports are re-pointed to the core path (:27-42).
  - Named imports from `@stencil/core` are filtered to `KEEP_IMPORTS` (:107-132; `h`, `Host`, `Fragment`, `Mixin`, `getElement`, `forceUpdate`, ...) and re-pointed. Decorator imports are dropped.
  - Uses `e.getText()`, so `h as foo` specifiers are dropped. Parity quirk.
- **Checker:** none.
- **Port:** easy.

#### 2.31 `rewrite-aliased-paths.ts` (232) + `map-imports-to-path-aliases.ts` (137)
- **Entries:** `rewriteAliasedSourceFileImportPaths` (:39) and `rewriteAliasedDTSImportPaths` (:14); `mapImportsToPathAliases` (:8, collection output, `after`).
- **What they do:** non-relative specifiers that `ts.resolveModuleName` (:156) resolves to a non-`node_modules` file become a relative path with the extension stripped and `./` prefixed. The collection variant maps `srcDir` to `outputTarget.dir`.
- **Checker:** none. Uses TS module resolution and `createCompilerHost`.
- **Port:** medium (oxc_resolver with tsconfig `paths`, including the `.d.ts` side).

#### 2.32 `add-tag-transform.ts` (231)
- **Entry:** `addTagTransform(compilerCtx, buildCtx)` (:43).
- **What it does:** only inside functions, methods or accessors (parent walk, :16-33). Known component tags inside `querySelector`/`querySelectorAll`/`closest` string selectors become template literals using `__stencil_transformTag("x")` (css-what parse/stringify, :65-152). The first argument of `customElements.get/define/whenDefined` and `document.createElement` gets wrapped in `__stencil_transformTag(...)` (:156-193).
  - Spec: `_test_/add-tag-transform.spec.ts:42`: `document.createElement('cmp-a')` → `document.createElement(__stencil_transformTag('cmp-a'))`.
- **Checker:** none.
- **Port:** medium (needs ancestor tracking and a CSS selector tokenizer).

#### 2.33 `remove-collection-imports.ts` (51)
- **Entry:** `removeCollectionImports` (:4).
- **What it does:** drops side-effect imports (`import 'ionicons'`) whose specifier is a known collection.
- **Checker:** none.
- **Port:** easy.

### collection (ingestion of node_modules Stencil libraries)

#### 2.34 `collection/parse-collection-module.ts` (71), `parse-collection-manifest.ts` (90), `parse-collection-components.ts` (57)
- **Entries:** `parseCollection` (:7), `parseCollectionManifest` (:9), `parseCollectionComponents` / `transpileCollectionModule` (:7, :32).
- **What they do:** read `collection.json`, then parse each entry, mixin and global as JS and run `updateModule` with `typeChecker = undefined` (:47-56). Write `compilerCtx.collections` and `CollectionCompilerMeta`.
- **Checker:** none.
- **Port:** medium (JSON plus reuse of the static parsers).

## 3. Summary table

| Transformer / group | Pipeline | Checker? | Difficulty |
|---|---|---|---|
| convert-decorators (orchestrator) | decorators-to-static | passes through only | medium |
| component-decorator + style-to-static | decorators-to-static | `getExportsOfModule` (diagnostic); resolveVar | easy |
| prop-decorator | decorators-to-static | **yes, runtime-critical `type`**; complexType, docs, defaultValue | **hard** |
| state-decorator | decorators-to-static | computed-name literal only | easy |
| event-decorator | decorators-to-static | complexType and docs only | easy (runtime) / hard (types) |
| method-decorator | decorators-to-static | signatures, Promise check, docs | easy (runtime) / hard (types) |
| element-decorator | decorators-to-static | no | easy |
| watch / listen / serialize | decorators-to-static | literal eval of identifier arguments | easy to medium |
| attach-internals (decorator) | decorators-to-static | JSDoc of state keys | easy |
| decorator-utils / resolveVar / import-alias-map | decorators-to-static | literal and const resolution, cross-file aliases | medium |
| transform-utils type section + type-library | shared (d2s) | **yes, heavy** (types, refs, docs) | **hard** |
| reserved-public-members | shared validation | no | easy |
| automatic-key-insertion | full build `before` | no | easy |
| static-to-meta visitor / updateModule | static-to-meta | optional | easy |
| static-to-meta component.ts | static-to-meta | component docs only | easy to medium |
| member parsers (props … encapsulation, styles) | static-to-meta | no | easy |
| call-expression / vdom / string-literal | static-to-meta | optional (const strings, functional deps) | easy (functional deps: medium) |
| import.ts + add-external-import | static-to-meta | no (module resolution) | medium |
| class-extension/* | static-to-meta | optional happy path; mini-programs are parse-only | hard |
| build-conditionals / detect-modern / meta-static | static-to-meta | no | easy |
| nativeComponentTransform + native-* helpers | component-native | no | easy to medium |
| native-static-style / add-static-style | component-native/lazy/ssr | no (needs scopeCss, CSS parser) | medium |
| addDefineCustomElementFunctions | component-native (standalone) | no | easy |
| proxyCustomElement (+ formatComponentRuntimeMeta) | component-native (standalone) | no | easy (+ medium util) |
| define-custom-element / add-component-meta-proxy | component-native (transpile()) | no | easy |
| lazy transforms | component-lazy | no | easy |
| ssr transforms | component-ssr | no | easy |
| style-imports / stencil-import-path | shared output | no | easy |
| update-stencil-core-import | shared output | no | easy |
| rewrite-aliased-paths / map-imports-to-path-aliases | shared / collection | no (TS module resolution) | medium |
| add-tag-transform | shared output | no | medium |
| remove-collection-imports | shared output | no | easy |
| collection/parse-* | collection ingest | no | medium |

## 4. Every distinct TypeChecker / Program API used, grouped by purpose

Each group is tagged with what its results feed.

1. **Runtime prop-type classification (runtime JS):**
   - `checker.getTypeAtLocation(propDecl)` (prop-decorator.ts:121, :179).
   - `Type.flags & TypeFlags.{Any, String, StringLike, StringLiteral, Number, NumberLike, NumberLiteral, Boolean, BooleanLike, Union}` and `UnionType.types` (prop-decorator.ts:313-376).
2. **Literal and constant evaluation (runtime JS: names, decorator arguments):**
   - `getTypeAtLocation(expr)` with `Type.isLiteral()` / `.value` (decorator-utils.ts:55, :106, :219; transform-utils.ts:510, :1529) and `Type.isStringLiteral()` (vdom.ts:20-21).
   - `getSymbolAtLocation` → `symbol.flags & SymbolFlags.Alias` → `getAliasedSymbol` → `symbol.valueDeclaration` / `declarations` (decorator-utils.ts:87-90; transform-utils.ts:411-414; prop-decorator.ts:577, :594).
   - `getPropertyOfType` and `getTypeOfSymbolAtLocation` (decorator-utils.ts:141, :152; transform-utils.ts:453, :460).
   - `getShorthandAssignmentValueSymbol` (prop-decorator.ts:647; defaultValue, docs only).
3. **Type printing for complexType and docs (types/docs only):**
   - `typeToString` (transform-utils.ts:991, flags `NoTruncation|InTypeAlias|InElementType`).
   - `typeToTypeNode` (prop-decorator.ts:259; method-decorator.ts:69 with `NodeBuilderFlags.NoTruncation|NoTypeReduction`).
   - `getTypeFromTypeNode` (event-decorator.ts:120; transform-utils.ts:624, :637, :953).
   - `isArrayType`, `getTypeArguments` (transform-utils.ts:1011-1012).
   - `Type.isUnion()`, `Type.aliasSymbol` / `aliasTypeArguments` plus `getTypeAtLocation(aliasDecl)` (transform-utils.ts:1006-1050).
   - `getSignatureFromDeclaration`, `getReturnTypeOfSignature`, `signatureToString` (flags `WriteArrowStyleSignature|NoTruncation`, `SignatureKind.Call`), `signature.parameters` (method-decorator.ts:67-80, :112-114).
   - `Type.isTypeParameter()`, `type.symbol` / `aliasSymbol.declarations[0].getText()` (type-library.ts:44, :300-365).
4. **Type-reference provenance (`complexType.references`, type library; types/docs only):**
   - `getSymbolAtLocation` + `getAliasedSymbol` on import specifiers, default imports and `typeof` queries (transform-utils.ts:645, :736, :876; type-library.ts:242).
   - `getTypeOfSymbolAtLocation(sym, enumOrClassDecl)` (transform-utils.ts:743, :882), `getTypeAtLocation(typeDecl)` (:747; type-library.ts:171), `symbol.getName()`.
   - `program.getCompilerOptions()` (transform-utils.ts:713), `program.getSourceFile()` (type-library.ts:89, :203), plus non-checker `ts.resolveModuleName` and `ts.createCompilerHost` (type-library.ts:197; transform-utils.ts:714).
5. **Documentation (types/docs only):**
   - `symbol.getDocumentationComment(checker)` and `symbol.getJsDocTags()` via `serializeSymbol` (transform-utils.ts:1171-1186).
   - `getDocumentationComment` on parameters and custom states (method-decorator.ts:115; attach-internals.ts:198); `signature.getDocumentationComment` and `getJsDocTags` (method-decorator.ts:125-126); `getTypeDocstring` (type-library.ts:322).
   - `ts.displayPartsToString`; syntactic `ts.getJSDocTags` (type-library.ts:287).
6. **Cross-file symbol and dependency resolution (runtime BUILD flags and inherited members):**
   - `getSymbolAtLocation` + `getAliasedSymbol` + `declarations[0].getSourceFile()` / `symbol.getDeclarations()` (call-expression.ts:27-35, :120-131; compiler-ctx-merge.ts:325-331).
7. **Module export validation (diagnostics only):**
   - `getExportsOfModule(getSymbolAtLocation(sourceFile))` + `SymbolFlags.Interface|TypeAlias|Enum` (component-decorator.ts:305-313).
   - The `@Method` Promise-return check via the return type string (method-decorator.ts:82-97).
8. **Program construction (mini programs):**
   - `ts.createProgram` (compiler-ctx-merge.ts:66; resolve-import-merge.ts:68; type-library.ts:85; plus `compiler/sys/typescript/typescript-resolve-module.ts:55`), `program.getTypeChecker()` (:67; :69; :86), `program.getSourceFile()` (:70; :70), `ts.transform`, `ts.createPrinter`.
9. **Non-checker TS services that still need Rust equivalents:**
   - `ts.resolveModuleName` (rewrite-aliased-paths.ts:156; map-imports-to-path-aliases.ts; type-library.ts:197); `ts.getCombinedModifierFlags` (type-library.ts:277); `ts.getOriginalNode` (diagnostic positions).
   - JS dependencies: postcss, postcss-selector-parser, postcss-safe-parser (transform-utils.ts:1-3), css-what (add-tag-transform.ts:1), `scopeCss` (`src/utils/shadow-css`).

## 5. Recommended port order for a minimum viable standalone (component-native) output

0. **Foundations (outside this dir, required):**
   - oxc pipeline: parse, semantic, TS strip, JSX → `h`, class fields per target, codegen.
   - Rust `Module` and `ComponentCompilerMeta` structs.
   - A `convertValueToLiteral` equivalent (serde value → AST, dropping `_`-prefixed keys).
   - **`src/utils/format-component-runtime-meta.ts`** (CMP_FLAGS, MEMBER_FLAGS, compact meta).
   - oxc_resolver configured with tsconfig paths.
1. **Decorator extraction straight to meta**, skipping the static-getter round trip for local sources:
   - `ImportAliasMap`, `@Component` options plus validation, `@State`, `@Element`, `@Event` (runtime fields), `@Method` (name, plus a syntactic async/Promise check), `@Listen`/`@Watch`/serializers, `@AttachInternals`; diagnostics including reserved names.
   - Then **`@Prop` with a syntactic type classifier**: keyword types, literal types, unions (mixed primitives → `any`), arrays/objects → `unknown`, local `type`/`enum` via oxc_semantic, one-hop imported aliases/enums via the resolver, initializer and getter-return literal inference, fallback `any`.
   - A small const evaluator for computed names and identifier decorator arguments.
   - Leave `complexType` as `{original: annotationText, resolved: original, references: {}}` for now.
2. **Component analysis:** lifecycle method flags, vdom/html metadata (run after the oxc JSX transform for parity with the `h()`-based detection), string-literal scan, styles normalisation, imports and `localImports`, `setComponentBuildConditionals` (replicate the always-false `hasElement`), `hasModernPropertyDecls` from the target config.
3. **Automatic key insertion** (pre-JSX transform).
4. **component-native codegen:**
   - `extends HTMLElement`, constructor (`registerHost`, `__registerHost`, `__attachShadow`, `createEvent`, attachInternals, `super(false)`), plain `connectedCallback`, element getter, watcher/serializer static getters, `static get is` for plain components.
   - `static get style()`, starting with external `styleUrls` and inline strings; scoped CSS needs a `scopeCss` port.
   - `const X = class ...` rewrite, style imports, `addImports`.
5. **Standalone wrappers:** `addDefineCustomElementFunctions` (needs the component dependency graph from `htmlTagNames`/`potentialCmpRefs`), `proxyCustomElement`, `updateStencilCoreImports`, `removeCollectionImports`.
6. **Second wave:**
   - `extends`/Mixin support (port `resolve-import-merge.ts` with an oxc_resolver-backed `resolveImport`; it is already checker-free).
   - Functional-component dependencies via import bindings.
   - `rewriteAliasedSourceFileImportPaths`, `addTagTransform`, `resolveVar`.
   - Collection ingestion (static-getter readers from 2.17).
7. **Deferred (types, docs, d.ts; a tsgo sidecar or a separate pass):** `complexType.resolved`/`references`, method signatures, docs/JSDoc fidelity, the type library, the single-export validation, and the collection output (it embeds `complexType` for consumers). Lazy and SSR transforms are cheap once step 4 exists, since they share the same helpers.
