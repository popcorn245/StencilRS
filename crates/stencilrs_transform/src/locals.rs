//! Top-level declarations of the module being analysed. In Stencil's single-file program these
//! are the only names the checker can resolve; imports and globals are unresolved (`any`).
//! With a [`Resolver`] (build-accurate mode), relative imports are followed too.

use rustc_hash::FxHashMap;
use std::rc::Rc;

use oxc::ast::ast::{
    ClassElement, Declaration, MethodDefinitionKind, Expression, ImportDeclarationSpecifier, Program, Statement,
    TSEnumDeclaration, TSSignature, TSType, TSTypeParameterDeclaration, VariableDeclarationKind,
};

use crate::complex_type::ExportedType;
use crate::eval::property_key_name;
use crate::resolve::{ModuleSummary, Resolver, TypeSummary, ValueSummary};

pub enum LocalType<'a, 'b> {
    Alias(&'b TSType<'a>),
    Enum(&'b TSEnumDeclaration<'a>),
    /// An interface: its member names, for `keyof`.
    Interface(&'b [TSSignature<'a>]),
    /// A class: its member names, for `keyof`.
    Class(Vec<String>),
}

pub enum LocalValue<'a, 'b> {
    Const(&'b Expression<'a>),
    Let(Option<&'b Expression<'a>>),
    /// A function declaration and its written return type, if any.
    Function(Option<&'b TSType<'a>>),
    /// Classes, enums and namespaces: object-typed values.
    Object,
}

/// `import { imported as local } from source`.
pub struct Import<'a> {
    pub source: &'a str,
    pub imported: String,
}

/// A class's `static` field, for `Class.field` in decorator arguments.
pub struct StaticField<'a, 'b> {
    pub name: String,
    pub readonly: bool,
    pub annotation: Option<&'b TSType<'a>>,
    pub init: Option<&'b Expression<'a>>,
}

/// A member of a class, for `this.member` in an initializer.
pub enum ThisMember<'a, 'b> {
    Field {
        annotation: Option<&'b TSType<'a>>,
        init: Option<&'b Expression<'a>>,
        readonly: bool,
        /// Declared with `?`: its type has `undefined` too.
        optional: bool,
    },
    /// A method and its written return type.
    Method(Option<&'b TSType<'a>>),
}

#[derive(Default)]
pub struct Locals<'a, 'b> {
    pub types: FxHashMap<&'a str, LocalType<'a, 'b>>,
    /// The type parameters of each generic type alias.
    pub alias_params: FxHashMap<&'a str, Vec<&'a str>>,
    /// The default type of each parameter of a generic type alias (`U = string`).
    pub alias_defaults: FxHashMap<&'a str, Vec<Option<&'b TSType<'a>>>>,
    /// Type parameters bound while a generic alias is evaluated, innermost last: the flags of
    /// the type argument each parameter stands for.
    pub bindings: std::cell::RefCell<Vec<(String, crate::prop_type::Flags)>>,
    /// The type parameters of each generic interface and class, with their defaults.
    pub decl_params: FxHashMap<&'a str, &'b TSTypeParameterDeclaration<'a>>,
    pub values: FxHashMap<&'a str, LocalValue<'a, 'b>>,
    /// The written type of each `const` that has one (`const X: 'a' = 'a'`).
    pub const_annotations: FxHashMap<&'a str, &'b TSType<'a>>,
    /// The written type of each variable that has one and no initializer (`declare const x: string`).
    pub declared: FxHashMap<&'a str, &'b TSType<'a>>,
    /// The instance fields and methods of each class declaration, for `this.x` and `new C().m()`.
    pub members: FxHashMap<&'a str, FxHashMap<String, ThisMember<'a, 'b>>>,
    /// The methods of each class that are generic, overloaded or declared twice: their call
    /// has no one signature to take a return type from.
    pub ambiguous_methods: FxHashMap<&'a str, rustc_hash::FxHashSet<String>>,
    /// Interfaces declared once, without type parameters or `extends`.
    pub plain_interfaces: rustc_hash::FxHashSet<&'a str>,
    /// Type names declared more than once (merged declarations).
    pub merged_types: rustc_hash::FxHashSet<&'a str>,
    /// The class whose members `this` stands for.
    pub current_class: std::cell::RefCell<Option<String>>,
    /// The static fields of each class declaration.
    pub statics: FxHashMap<&'a str, Vec<StaticField<'a, 'b>>>,
    pub imports: FxHashMap<&'a str, Import<'a>>,
    /// Build-accurate mode: follow relative imports, and treat lib types as known objects.
    pub resolver: Option<&'b Resolver>,
    /// Path of this module, for resolving its relative imports.
    pub file: String,
}

impl<'a, 'b> Locals<'a, 'b> {
    pub fn collect(program: &'b Program<'a>) -> Self {
        let mut locals = Locals::default();
        for stmt in &program.body {
            if let Statement::ImportDeclaration(import) = stmt {
                for spec in import.specifiers.iter().flatten() {
                    let (local, imported) = match spec {
                        ImportDeclarationSpecifier::ImportSpecifier(s) => {
                            (s.local.name.as_str(), s.imported.name().to_string())
                        }
                        ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                            (s.local.name.as_str(), "default".to_owned())
                        }
                        ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => {
                            (s.local.name.as_str(), "*".to_owned())
                        }
                    };
                    locals.imports.insert(
                        local,
                        Import {
                            source: import.source.value.as_str(),
                            imported,
                        },
                    );
                }
                continue;
            }
            let decl = match stmt {
                Statement::ExportDeclaration(e) => Some(&e.declaration),
                other => other.as_declaration(),
            };
            match decl {
                Some(Declaration::TSTypeAliasDeclaration(t)) => {
                    if locals
                        .types
                        .insert(t.id.name.as_str(), LocalType::Alias(&t.type_annotation))
                        .is_some()
                    {
                        locals.merged_types.insert(t.id.name.as_str());
                    }
                    if let Some(params) = &t.type_parameters {
                        locals.alias_params.insert(
                            t.id.name.as_str(),
                            params.params.iter().map(|p| p.name.name.as_str()).collect(),
                        );
                        locals.alias_defaults.insert(
                            t.id.name.as_str(),
                            params.params.iter().map(|p| p.default.as_ref()).collect(),
                        );
                    }
                }
                Some(Declaration::TSEnumDeclaration(e)) => {
                    if locals
                        .types
                        .insert(e.id.name.as_str(), LocalType::Enum(e))
                        .is_some()
                    {
                        locals.merged_types.insert(e.id.name.as_str());
                    }
                    locals.values.insert(e.id.name.as_str(), LocalValue::Object);
                }
                Some(Declaration::TSInterfaceDeclaration(i)) => {
                    if i.type_parameters.is_none() && i.extends.is_empty() {
                        locals.plain_interfaces.insert(i.id.name.as_str());
                    }
                    if locals
                        .types
                        .insert(i.id.name.as_str(), LocalType::Interface(&i.body.body))
                        .is_some()
                    {
                        locals.merged_types.insert(i.id.name.as_str());
                    }
                    if let Some(params) = &i.type_parameters {
                        locals.decl_params.insert(i.id.name.as_str(), params);
                    }
                }
                Some(Declaration::ClassDeclaration(c)) => {
                    if let Some(id) = &c.id {
                        let members = c
                            .body
                            .body
                            .iter()
                            .filter_map(|el| el.property_key().and_then(property_key_name))
                            .collect();
                        if locals
                            .types
                            .insert(id.name.as_str(), LocalType::Class(members))
                            .is_some()
                        {
                            locals.merged_types.insert(id.name.as_str());
                        }
                        if let Some(params) = &c.type_parameters {
                            locals.decl_params.insert(id.name.as_str(), params);
                        }
                        locals.values.insert(id.name.as_str(), LocalValue::Object);
                        let statics = c
                            .body
                            .body
                            .iter()
                            .filter_map(|el| match el {
                                ClassElement::PropertyDefinition(p)
                                    if p.r#static && !p.computed =>
                                {
                                    Some(StaticField {
                                        name: property_key_name(&p.key)?,
                                        readonly: p.readonly,
                                        annotation: p
                                            .type_annotation
                                            .as_ref()
                                            .map(|t| &t.type_annotation),
                                        init: p.value.as_ref(),
                                    })
                                }
                                _ => None,
                            })
                            .collect();
                        locals.statics.insert(id.name.as_str(), statics);
                        let mut members = FxHashMap::default();
                        for el in &c.body.body {
                            match el {
                                ClassElement::PropertyDefinition(p)
                                    if !p.r#static && !p.computed =>
                                {
                                    if let Some(name) = property_key_name(&p.key) {
                                        members.insert(
                                            name,
                                            ThisMember::Field {
                                                annotation: p
                                                    .type_annotation
                                                    .as_ref()
                                                    .map(|t| &t.type_annotation),
                                                init: p.value.as_ref(),
                                                readonly: p.readonly,
                                                optional: p.optional,
                                            },
                                        );
                                    }
                                }
                                ClassElement::MethodDefinition(m)
                                    if !m.r#static
                                        && !m.computed
                                        && m.kind == MethodDefinitionKind::Method =>
                                {
                                    if let Some(name) = property_key_name(&m.key) {
                                        if members.contains_key(&name)
                                            || m.value.type_parameters.is_some()
                                            || m.value.this_param.is_some()
                                        {
                                            locals
                                                .ambiguous_methods
                                                .entry(id.name.as_str())
                                                .or_default()
                                                .insert(name.clone());
                                        }
                                        members.insert(
                                            name,
                                            ThisMember::Method(
                                                m.value
                                                    .return_type
                                                    .as_ref()
                                                    .map(|t| &t.type_annotation),
                                            ),
                                        );
                                    }
                                }
                                _ => {}
                            }
                        }
                        locals.members.insert(id.name.as_str(), members);
                    }
                }
                Some(Declaration::FunctionDeclaration(f)) => {
                    if let Some(id) = &f.id {
                        let returns = f.return_type.as_ref().map(|t| &t.type_annotation);
                        locals
                            .values
                            .insert(id.name.as_str(), LocalValue::Function(returns));
                    }
                }
                Some(Declaration::VariableDeclaration(v)) => {
                    for d in &v.declarations {
                        let Some(name) = d.id.get_identifier_name() else {
                            continue;
                        };
                        if let (VariableDeclarationKind::Const, Some(t)) =
                            (v.kind, &d.type_annotation)
                        {
                            locals
                                .const_annotations
                                .insert(name.as_str(), &t.type_annotation);
                        }
                        if d.init.is_none()
                            && let Some(t) = &d.type_annotation
                        {
                            locals.declared.insert(name.as_str(), &t.type_annotation);
                        }
                        let value = match (v.kind, &d.init) {
                            (VariableDeclarationKind::Const, Some(init)) => LocalValue::Const(init),
                            (_, init) => LocalValue::Let(init.as_ref()),
                        };
                        locals.values.insert(name.as_str(), value);
                    }
                }
                _ => {}
            }
        }
        locals
    }

    /// Enable build-accurate mode for a module at `file`.
    pub fn with_resolver(mut self, resolver: Option<&'b Resolver>, file: &str) -> Self {
        self.resolver = resolver;
        self.file = file.to_owned();
        self
    }

    /// `this` stands for the members of class `name`.
    pub fn enter_class(&self, name: Option<&str>) {
        *self.current_class.borrow_mut() = name.map(str::to_owned);
    }

    pub fn resolving(&self) -> bool {
        self.resolver.is_some()
    }

    pub fn const_init(&self, name: &str) -> Option<&'b Expression<'a>> {
        match self.values.get(name) {
            Some(LocalValue::Const(init)) => Some(init),
            _ => None,
        }
    }

    fn imported_module(&self, name: &str) -> Option<(Rc<ModuleSummary>, &Import<'a>)> {
        let resolver = self.resolver?;
        let import = self.imports.get(name)?;
        Some((resolver.module(&self.file, import.source)?, import))
    }

    /// The summary of an imported type, when the import resolves.
    pub fn imported_type(&self, name: &str) -> Option<TypeSummary> {
        let (module, import) = self.imported_module(name)?;
        module.types.get(&import.imported).copied()
    }

    /// The declaration of an imported type, when the import resolves.
    pub fn imported_def(&self, name: &str) -> Option<ExportedType> {
        let (module, import) = self.imported_module(name)?;
        module.defs.get(&import.imported).cloned()
    }

    /// The summary of an imported value, when the import resolves.
    pub fn imported_value(&self, name: &str) -> Option<ValueSummary> {
        let (module, import) = self.imported_module(name).or_else(|| {
            let resolver = self.resolver?;
            let import = self.imports.get(name)?;
            Some((resolver.package_module(&self.file, import.source)?, import))
        })?;
        module.values.get(&import.imported).cloned()
    }

    /// Whether `name` is imported from somewhere we cannot follow (a package, a missing file).
    pub fn is_unresolved_import(&self, name: &str) -> bool {
        self.imports.contains_key(name) && self.imported_module(name).is_none()
    }
}
