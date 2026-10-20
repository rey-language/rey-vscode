import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ReyParser, TokenType } from '../server/parser';
import { ReyAnalyzer, BUILTIN_FUNCTIONS } from '../server/analyzer';
import { DiagnosticsProvider, DIAGNOSTIC_CODES } from '../server/diagnostics';
import { Position, Range } from 'vscode-languageserver/node';

describe('Rey Lexer & Parser Edge Cases', () => {
    const parser = new ReyParser();

    test('should lex and parse hex, binary, underscores and scientific notation numbers', () => {
        const code = `
            const a: int = 0x1A2B;
            const b: int = 0b10101;
            const c: int = 1_000_000;
            const d: float = 3.14_15;
            const e: float = 1.0e-5;
            const f: float = 2e10;
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0, `Expected 0 errors, got: ${JSON.stringify(res.errors)}`);
        assert.equal(res.module.declarations.length, 6);
    });

    test('should lex block comments and single-line comments properly', () => {
        const code = `
            // Single line comment
            /* Block comment on single line */
            /*
               Multiline
               block comment
            */
            var x: int = 42;
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        assert.equal(res.module.declarations.length, 1);
        const decl = res.module.declarations[0] as any;
        assert.equal(decl.name, 'x');
    });

    test('should lex and parse string interpolation and escaped braces', () => {
        const code = `
            var greeting: string = "Hello, {name}!";
            var complex: string = "Result: {x + y} with escaped {{braces}}";
            var triple: string = """
                Multiline text
                with {interpolated}
            """;
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        assert.equal(res.module.declarations.length, 3);
    });

    test('should lex char literals and escapes', () => {
        const code = `
            const c1: char = 'a';
            const c2: char = '\\n';
            const c3: char = '\\x41';
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        assert.equal(res.module.declarations.length, 3);
    });

    test('should parse structs with pub fields and methods', () => {
        const code = `
            struct Point {
                pub x: int,
                pub y: int,

                pub func dist(): float {
                    return 0.0;
                }
            }
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        const s = res.module.declarations[0] as any;
        assert.equal(s.name, 'Point');
        assert.equal(s.fields.length, 2);
        assert.equal(s.methods.length, 1);
        assert.equal(s.fields[0].isPub, true);
    });

    test('should parse enums with unit variants, positional payloads, and named payloads', () => {
        const code = `
            enum Event {
                Quit,
                Click(int, int),
                Paste(text: string)
            }
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        const e = res.module.declarations[0] as any;
        assert.equal(e.name, 'Event');
        assert.equal(e.variants.length, 3);
        assert.equal(e.variants[0].name, 'Quit');
        assert.equal(e.variants[1].name, 'Click');
        assert.equal(e.variants[1].params.length, 2);
        assert.equal(e.variants[2].name, 'Paste');
        assert.equal(e.variants[2].params[0].name, 'text');
    });

    test('should parse match expressions with various pattern edge cases', () => {
        const code = `
            func handle(x: any): string {
                return match x {
                    0..9 => "digit",
                    Event::Click(x, y) => "click",
                    Option::Some(val) => "some",
                    Point { x, y } => "point",
                    (a, b) => "tuple",
                    "exact" => "str",
                    _ => "other"
                };
            }
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        const fn = res.module.declarations[0] as any;
        const retStmt = fn.body.statements[0];
        assert.equal(retStmt.type, 'ReturnStmt');
        assert.equal(retStmt.value.type, 'MatchExpr');
        assert.equal(retStmt.value.arms.length, 7);
    });

    test('should parse lambdas in expressions', () => {
        const code = `
            var f1 = (x: int, y: int) => x + y;
            var f2 = x => x * 2;
            var f3 = (v: int) => {
                println(v);
                return;
            };
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        assert.equal(res.module.declarations.length, 3);
    });

    test('should parse generic and compound types: Vec, HashMap, Option, Result, functions, tuples, nullables, unions', () => {
        const code = `
            var v: Vec<int> = [1, 2, 3];
            var m: HashMap<string, Vec<int>> = {"a": [1]};
            var opt: Option<string> = Option::Some("test");
            var res: Result<int, string> = Result::Ok(100);
            var cb: (int, string) -> bool = (a, b) => true;
            var tup: (int, string, bool) = (1, "two", true);
            var n: int? = null;
            var u: int | string = "hello";
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        assert.equal(res.module.declarations.length, 8);
    });

    test('should flag missing semicolons on statements', () => {
        const code = `
            var x: int = 10
            const y: int = 20;
        `;
        const res = parser.parse(code);
        const varX = res.module.declarations[0] as any;
        assert.equal(varX.hasSemicolon, false);
        const constY = res.module.declarations[1] as any;
        assert.equal(constY.hasSemicolon, true);
    });

    test('should parse imports correctly', () => {
        const code = `
            import "math.rey";
            import std::io;
            import std::collections::{HashMap, Vec};
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        assert.equal(res.module.declarations.length, 3);
        const imp3 = res.module.declarations[2] as any;
        assert.equal(imp3.items.length, 2);
    });
});

describe('Rey Hierarchical Analyzer & LSP Services', () => {
    const parser = new ReyParser();

    test('should resolve hierarchical scopes and variable shadowing', () => {
        const code = `
            var x: int = 10;
            func test(): void {
                var x: string = "shadowed";
                println(x);
                if (true) {
                    var x: bool = true;
                    println(x);
                }
            }
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);

        // Position on line 3 (var x: string = "shadowed")
        const hover1 = analyzer.getHoverInfo(Position.create(3, 20));
        assert.ok(hover1);
        assert.match(hover1.type ?? '', /string/);

        // Position on line 1 (top-level var x: int)
        const hoverTop = analyzer.getHoverInfo(Position.create(1, 16));
        assert.ok(hoverTop);
        assert.match(hoverTop.type ?? '', /int/);
    });

    test('should infer types accurately for literals and collections', () => {
        const code = `
            var num = 42;
            var flt = 3.14;
            var str = "rey";
            var arr = [1, 2, 3];
            var tup = (10, "rey");
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);

        const syms = analyzer.getSymbolsInScope(Position.create(6, 0));
        const numSym = syms.find(s => s.name === 'num');
        assert.equal(numSym?.type, 'int');

        const fltSym = syms.find(s => s.name === 'flt');
        assert.equal(fltSym?.type, 'float');

        const strSym = syms.find(s => s.name === 'string');
        const tupSym = syms.find(s => s.name === 'tup');
        assert.equal(tupSym?.type, '(int, string)');
    });

    test('should provide member completions for string, Vec, HashMap, Option, Result', () => {
        const code = `
            var s: string = "test";
            var v: Vec<int> = [1, 2];
            var m: HashMap<string, int> = {"a": 1};
            var opt: Option<int> = Option::Some(1);
            var res: Result<int, string> = Result::Ok(1);
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);

        const strMembers = analyzer.getMembers('string');
        assert.ok(strMembers.some(m => m.name === 'len'));
        assert.ok(strMembers.some(m => m.name === 'toUpper'));
        assert.ok(strMembers.some(m => m.name === 'split'));

        const vecMembers = analyzer.getMembers('Vec<int>');
        assert.ok(vecMembers.some(m => m.name === 'push'));
        assert.ok(vecMembers.some(m => m.name === 'pop'));
        assert.ok(vecMembers.some(m => m.name === 'map'));
        assert.ok(vecMembers.some(m => m.name === 'filter'));

        const mapMembers = analyzer.getMembers('HashMap<string, int>');
        assert.ok(mapMembers.some(m => m.name === 'set'));
        assert.ok(mapMembers.some(m => m.name === 'keys'));

        const optMembers = analyzer.getMembers('Option<int>');
        assert.ok(optMembers.some(m => m.name === 'isSome'));
        assert.ok(optMembers.some(m => m.name === 'unwrapOr'));

        const resMembers = analyzer.getMembers('Result<int, string>');
        assert.ok(resMembers.some(m => m.name === 'isOk'));
        assert.ok(resMembers.some(m => m.name === 'unwrapErr'));
    });

    test('should provide path members for static calls and enums', () => {
        const code = `
            enum Color { Red, Green, Blue }
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);

        const colorMembers = analyzer.getPathMembers('Color');
        assert.equal(colorMembers.length, 3);
        assert.ok(colorMembers.some(m => m.name === 'Red'));

        const optStatic = analyzer.getPathMembers('Option');
        assert.ok(optStatic.some(m => m.name === 'Some'));
        assert.ok(optStatic.some(m => m.name === 'None'));

        const vecStatic = analyzer.getPathMembers('Vec');
        assert.ok(vecStatic.some(m => m.name === 'new'));
    });

    test('should provide builtin function hovers with signatures and docs', () => {
        const code = `
            println("hello");
            readFile("data.txt");
            wrapAdd(1, 2);
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);

        const h1 = analyzer.getHoverInfo(Position.create(1, 14));
        assert.ok(h1);
        assert.match(h1.signature ?? '', /println/);

        const h2 = analyzer.getHoverInfo(Position.create(2, 14));
        assert.ok(h2);
        assert.match(h2.signature ?? '', /readFile/);

        const h3 = analyzer.getHoverInfo(Position.create(3, 14));
        assert.ok(h3);
        assert.match(h3.signature ?? '', /wrapAdd/);
    });

    test('should find definition and references within exact scopes', () => {
        const code = `
            var myVar: int = 100;
            func compute(): int {
                return myVar + 1;
            }
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);

        // Position of myVar in return statement (line 3, col 24)
        const def = analyzer.getDefinition(Position.create(3, 24));
        assert.ok(def);
        assert.equal(def.range.start.line, 1);

        const refs = analyzer.getReferences(Position.create(1, 18));
        assert.ok(refs.length >= 2); // declaration + 1 reference
    });
});

describe('Rey Diagnostics & QuickFixes', () => {
    const parser = new ReyParser();

    test('should emit warnings and quick-fix data for uppercase primitive types', () => {
        const code = `
            var s: String = "test";
            func done(): Void {}
            var n: Int = 10;
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);
        const diagProvider = new DiagnosticsProvider(res, analyzer);
        const diags = diagProvider.getDiagnostics();

        const uppercaseDiags = diags.filter(d => d.code === DIAGNOSTIC_CODES.UPPERCASE_PRIMITIVE);
        assert.equal(uppercaseDiags.length, 3);
        assert.equal((uppercaseDiags[0].data as any).replacement, 'string');
        assert.equal((uppercaseDiags[1].data as any).replacement, 'void');
        assert.equal((uppercaseDiags[2].data as any).replacement, 'int');
    });

    test('should emit errors for missing semicolons on statements', () => {
        const code = `
            var a: int = 1
            const b: int = 2;
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);
        const diagProvider = new DiagnosticsProvider(res, analyzer);
        const diags = diagProvider.getDiagnostics();

        const semicolonDiags = diags.filter(d => d.code === DIAGNOSTIC_CODES.MISSING_SEMICOLON);
        assert.equal(semicolonDiags.length, 1);
    });

    test('should detect duplicate struct fields and duplicate enum variants', () => {
        const code = `
            struct Bad {
                name: string,
                name: int
            }
            enum Colors {
                Red,
                Red
            }
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);
        const diagProvider = new DiagnosticsProvider(res, analyzer);
        const diags = diagProvider.getDiagnostics();

        assert.ok(diags.some(d => d.code === DIAGNOSTIC_CODES.DUPLICATE_FIELD));
        assert.ok(diags.some(d => d.code === DIAGNOSTIC_CODES.DUPLICATE_VARIANT));
    });

    test('should detect variadic parameter not being last', () => {
        const code = `
            func bad(...args: any, last: int): void {}
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///test.rey', res);
        const diagProvider = new DiagnosticsProvider(res, analyzer);
        const diags = diagProvider.getDiagnostics();

        assert.ok(diags.some(d => d.code === DIAGNOSTIC_CODES.VARIADIC_NOT_LAST));
    });
});
