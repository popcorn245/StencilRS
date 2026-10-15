//! Top-level declarations of the module being analysed. In Stencil's single-file program these
//! are the only names the checker can resolve; imports and globals are unresolved (`any`).
//! With a [`Resolver`] (build-accurate mode), relative imports are followed too.

use std::collections::HashMap;
use std::rc::Rc;

use oxc::ast::ast::{
    Declaration, Expression, ImportDeclarationSpecifier, Program, Statement, TSEnumDeclaration,
    TSSignature, TSType, VariableDeclarationKind,
};

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

#[derive(Default)]
pub struct Locals<'a, 'b> {
    pub types: HashMap<&'a str, LocalType<'a, 'b>>,
    pub values: HashMap<&'a str, LocalValue<'a, 'b>>,
    pub imports: HashMap<&'a str, Import<'a>>,
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
                        ImportDeclarationSpecifier::ImportSpecifier(s) => (s.local.name.as_str(), s.imported.name().to_string()),
                        ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => (s.local.name.as_str(), "default".to_owned()),
                        ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => (s.local.name.as_str(), "*".to_owned()),
                    };
                    locals.imports.insert(local, Import { source: import.source.value.as_str(), imported });
                }
                continue;
            }
            let decl = match stmt {
                Statement::ExportDeclaration(e) => Some(&e.declaration),
                other => other.as_declaration(),
            };
            match decl {
                Some(Declaration::TSTypeAliasDeclaration(t)) => {
                    locals.types.insert(t.id.name.as_str(), LocalType::Alias(&t.type_annotation));
                }
                Some(Declaration::TSEnumDeclaration(e)) => {
                    locals.types.insert(e.id.name.as_str(), LocalType::Enum(e));
                    locals.values.insert(e.id.name.as_str(), LocalValue::Object);
                }
                Some(Declaration::TSInterfaceDeclaration(i)) => {
                    locals.types.insert(i.id.name.as_str(), LocalType::Interface(&i.body.body));
                }
                Some(Declaration::ClassDeclaration(c)) => {
                    if let Some(id) = &c.id {
                        let members = c
                            .body
                            .body
                            .iter()
                            .filter_map(|el| el.property_key().and_then(property_key_name))
                            .collect();
                        locals.types.insert(id.name.as_str(), LocalType::Class(members));
                        locals.values.insert(id.name.as_str(), LocalValue::Object);
                    }
                }
                Some(Declaration::FunctionDeclaration(f)) => {
                    if let Some(id) = &f.id {
                        let returns = f.return_type.as_ref().map(|t| &t.type_annotation);
                        locals.values.insert(id.name.as_str(), LocalValue::Function(returns));
                    }
                }
                Some(Declaration::VariableDeclaration(v)) => {
                    for d in &v.declarations {
                        let Some(name) = d.id.get_identifier_name() else { continue };
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

    /// The summary of an imported value, when the import resolves.
    pub fn imported_value(&self, name: &str) -> Option<ValueSummary> {
        let (module, import) = self.imported_module(name)?;
        module.values.get(&import.imported).cloned()
    }

    /// Whether `name` is imported from somewhere we cannot follow (a package, a missing file).
    pub fn is_unresolved_import(&self, name: &str) -> bool {
        self.imports.contains_key(name) && self.imported_module(name).is_none()
    }
}
