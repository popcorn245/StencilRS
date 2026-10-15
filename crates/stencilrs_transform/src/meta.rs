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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentMeta {
    pub tag_name: String,
    pub component_class_name: String,
    pub encapsulation: Encapsulation,
    pub style_urls: Vec<String>,
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
}

#[derive(Debug, Clone, Serialize)]
pub struct StateMeta {
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct EventMeta {
    pub name: String,
    pub method: String,
    pub bubbles: bool,
    pub cancelable: bool,
    pub composed: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct MethodMeta {
    pub name: String,
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
