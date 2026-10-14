//! Top-level declarations of the module being analysed. In Stencil's single-file program these
//! are the only names the checker can resolve; imports and globals are unresolved (`any`).

use std::collections::HashMap;

use oxc::ast::ast::{
    Declaration, Expression, Program, Statement, TSEnumDeclaration, TSSignature, TSType,
    VariableDeclarationKind,
};

use crate::eval::property_key_name;

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
    /// Functions, classes, enums and namespaces: object-typed values.
    Object,
}

#[derive(Default)]
pub struct Locals<'a, 'b> {
    pub types: HashMap<&'a str, LocalType<'a, 'b>>,
    pub values: HashMap<&'a str, LocalValue<'a, 'b>>,
}

impl<'a, 'b> Locals<'a, 'b> {
    pub fn collect(program: &'b Program<'a>) -> Self {
        let mut locals = Locals::default();
        for stmt in &program.body {
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
                        locals.values.insert(id.name.as_str(), LocalValue::Object);
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

    pub fn const_init(&self, name: &str) -> Option<&'b Expression<'a>> {
        match self.values.get(name) {
            Some(LocalValue::Const(init)) => Some(init),
            _ => None,
        }
    }
}
