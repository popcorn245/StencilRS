//! Component metadata, shaped like Stencil's `ComponentCompilerMeta` (subset).
//!
//! Field names serialize to the same camelCase keys Stencil uses so the JSON can be
//! diffed against `transpileSync(...).data` from real Stencil v5.

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PropType {
    Any,
    Boolean,
    Number,
    String,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Encapsulation {
    None,
    Scoped,
    Shadow,
}

/// A component global style (`parseGlobalStyles`): inline CSS, or the path of a stylesheet.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalStyle {
    pub absolute_path: Option<String>,
    pub style_str: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentMeta {
    pub tag_name: String,
    pub component_class_name: String,
    pub encapsulation: Encapsulation,
    pub style_urls: Vec<String>,
    /// `@Component({ globalStyle, globalStyleUrl })`, in Stencil's order (inline, then URL).
    pub global_styles: Vec<GlobalStyle>,
    pub properties: Vec<PropMeta>,
    pub states: Vec<StateMeta>,
    pub events: Vec<EventMeta>,
    pub methods: Vec<MethodMeta>,
    pub listeners: Vec<ListenerMeta>,
    pub watchers: Vec<WatcherMeta>,
    pub element_ref: Option<String>,
    /// The `@AttachInternals()` member.
    pub attach_internals_member_name: Option<String>,
    /// `@AttachInternals({ states })`, in order.
    pub attach_internals_custom_states: Vec<CustomState>,
    /// `@AttachInternals()` without `formAssociated: false`.
    pub form_associated: bool,
    /// `@PropSerialize(prop)` methods (prop → attribute).
    pub serializers: Vec<WatcherMeta>,
    /// `@AttrDeserialize(prop)` methods (attribute → prop).
    pub deserializers: Vec<WatcherMeta>,
    /// The class's JSDoc.
    pub docs: Docs,
    /// The evaluated `@Component({...})` options, for code generation.
    #[serde(skip)]
    pub options: serde_json::Value,
    /// An ancestor class was found and its members merged (Stencil's `doesExtend`): the
    /// constructor then calls `super(false)`.
    #[serde(skip)]
    pub does_extend: bool,
    /// The other files the ancestors were read from (absolute, `/`-separated).
    #[serde(skip)]
    pub base_class_files: Vec<String>,
    /// The names of the methods of the class and its ancestors (`classMethods`).
    #[serde(skip)]
    pub class_methods: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PropMeta {
    pub name: String,
    #[serde(rename = "type")]
    pub prop_type: PropType,
    pub mutable: bool,
    pub required: bool,
    pub optional: bool,
    pub getter: bool,
    pub setter: bool,
    pub reflect: bool,
    /// `null` when the prop has no attribute (its type is `unknown`).
    pub attribute: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<String>,
    /// The type annotation as written (`complexType.original`).
    pub complex_type_original: String,
    pub complex_type: ComplexType,
    pub docs: Docs,
}

/// JSDoc as `ts.displayPartsToString(getDocumentationComment())` and `getJsDocTags()`.
#[derive(Debug, Clone, Default, Serialize)]
pub struct Docs {
    pub text: String,
    pub tags: Vec<DocsTag>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DocsTag {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

/// A prop's or event's type, as Stencil's docs and `components.d.ts` carry it.
#[derive(Debug, Clone, Default, Serialize)]
pub struct ComplexType {
    pub original: String,
    pub resolved: String,
    pub references: References,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct MethodComplexType {
    pub signature: String,
    pub parameters: Vec<MethodParameter>,
    pub references: References,
    #[serde(rename = "return")]
    pub return_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MethodParameter {
    pub name: String,
    #[serde(rename = "type")]
    pub type_text: String,
    pub docs: String,
}

/// Type references by name, in the order Stencil finds them (a JS object's key order).
#[derive(Debug, Clone, Default)]
pub struct References(pub Vec<(String, TypeReference)>);

impl Serialize for References {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut map = s.serialize_map(Some(self.0.len()))?;
        for (k, v) in &self.0 {
            map.serialize_entry(k, v)?;
        }
        map.end()
    }
}

/// `location` is `local` (declared and exported in this file), `import` or `global`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeReference {
    pub location: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    pub id: String,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub is_default: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_location: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StateMeta {
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventMeta {
    pub name: String,
    pub method: String,
    pub bubbles: bool,
    pub cancelable: bool,
    pub composed: bool,
    pub docs: Docs,
    pub complex_type: ComplexType,
    /// The `EventEmitter<T>` type argument as written, `any` without one.
    #[serde(skip)]
    pub complex_type_original: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MethodMeta {
    pub name: String,
    pub docs: Docs,
    pub complex_type: MethodComplexType,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListenerMeta {
    pub name: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
    pub capture: bool,
    pub passive: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomState {
    pub name: String,
    pub initial_value: bool,
    /// The state's JSDoc text.
    pub docs: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatcherMeta {
    pub prop_name: String,
    pub method_name: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Level {
    Error,
    Warn,
}

#[derive(Debug, Clone, Serialize)]
pub struct Diagnostic {
    pub level: Level,
    pub message: String,
    /// Byte offsets into the source.
    pub start: u32,
    pub end: u32,
}
