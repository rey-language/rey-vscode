import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { ReyParser } from '../server/parser';
import { ReyAnalyzer } from '../server/analyzer';
import { DiagnosticsProvider } from '../server/diagnostics';
import { Position, Range } from 'vscode-languageserver/node';

describe('Rey Extreme Edge Cases', () => {
    const parser = new ReyParser();

    test('should handle empty programs and comments-only programs gracefully', () => {
        const emptyRes = parser.parse('');
        assert.equal(emptyRes.errors.length, 0);
        assert.equal(emptyRes.module.declarations.length, 0);

        const commentsOnly = `
            // Just a comment
            /* Block comment */
            /* Multi-line
               comment
            */
        `;
        const commRes = parser.parse(commentsOnly);
        assert.equal(commRes.errors.length, 0);
        assert.equal(commRes.module.declarations.length, 0);
    });

    test('should handle 5-level nested scopes and shadowing', () => {
        const code = `
            var a: int = 1;
            func level1(): void {
                var a: string = "level1";
                while (true) {
                    var a: bool = true;
                    if (a) {
                        var a: float = 3.14;
                        {
                            var a: char = 'x';
                            println(a);
                        }
                    }
                }
            }
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        const analyzer = new ReyAnalyzer('file:///deep.rey', res);

        // Hover inner-most 'a' inside block (line 10, col 36)
        const innerHover = analyzer.getHoverInfo(Position.create(9, 32));
        assert.ok(innerHover);
        assert.match(innerHover.type ?? '', /char/);

        // Hover outer 'a' in level 1 (line 3, col 20)
        const outerHover = analyzer.getHoverInfo(Position.create(3, 20));
        assert.ok(outerHover);
        assert.match(outerHover.type ?? '', /string/);
    });

    test('should parse deeply nested generic types', () => {
        const code = `
            var complex: Vec<HashMap<string, Result<Option<int>, string>>>;
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        const decl = res.module.declarations[0] as any;
        assert.equal(decl.typeAnnotation.raw, 'Vec<HashMap<string, Result<Option<int>, string>>>');
    });

    test('should handle complex expressions and operator precedence', () => {
        const code = `
            var res = 1 + 2 * 3 - 4 / 2 > 0 && true || false;
            var bit = 1 | 2;
            var un = - -5;
            var callChain = obj.first().second.third();
        `;
        const res = parser.parse(code);
        assert.equal(res.errors.length, 0);
        assert.equal(res.module.declarations.length, 4);
    });

    test('should handle signature help at different argument commas', () => {
        const code = `
            func testCall(): void {
                clamp(10, 0, 100);
            }
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///sig.rey', res);

        // Inside clamp(10, |0, 100) -> 2nd argument (index 1) at character 25
        const sigHelpParam1 = analyzer.getSignatureHelp(Position.create(2, 25));
        assert.ok(sigHelpParam1);
        assert.equal(sigHelpParam1.activeParameter, 1);

        // Inside clamp(10, 0, |100) -> 3rd argument (index 2) at character 27
        const sigHelpParam2 = analyzer.getSignatureHelp(Position.create(2, 27));
        assert.ok(sigHelpParam2);
        assert.equal(sigHelpParam2.activeParameter, 2);
        assert.match(sigHelpParam2.signatures[0].label, /clamp/);
    });

    test('should generate inlay hints for variables with omitted types', () => {
        const code = `
            var num = 42;
            var text = "rey";
            var flag = true;
        `;
        const res = parser.parse(code);
        const analyzer = new ReyAnalyzer('file:///inlay.rey', res);

        const hints = analyzer.getInlayHints(Range.create(Position.create(0, 0), Position.create(5, 0)));
        assert.ok(hints.length >= 3);
        const numHint = hints.find(h => h.label === ': int');
        assert.ok(numHint, 'Expected : int inlay hint');
    });

    test('should validate TextMate grammar JSON syntax and structure', () => {
        const grammarPath = path.resolve(__dirname, '../../syntaxes/rey.tmLanguage.json');
        assert.ok(fs.existsSync(grammarPath), 'Grammar file must exist');

        const grammarContent = fs.readFileSync(grammarPath, 'utf8');
        const grammar = JSON.parse(grammarContent);
        assert.equal(grammar.scopeName, 'source.rey');
        assert.ok(grammar.patterns);
        assert.ok(grammar.repository);
        assert.ok(grammar.repository["keywords-control"]);
        assert.ok(grammar.repository.types);
        assert.ok(grammar.repository.strings);
        assert.ok(grammar.repository.numbers);
        assert.ok(grammar.repository["builtin-functions"]);
    });

    test('should validate language configuration JSON', () => {
        const configPath = path.resolve(__dirname, '../../language-configuration.json');
        assert.ok(fs.existsSync(configPath), 'language-configuration.json must exist');

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert.ok(config.comments);
        assert.equal(config.comments.lineComment, '//');
        assert.deepEqual(config.comments.blockComment, ['/*', '*/']);
        assert.ok(config.brackets);
        assert.ok(config.autoClosingPairs);
    });

    test('should validate snippets JSON and prefix definitions', () => {
        const snippetsPath = path.resolve(__dirname, '../../snippets/rey.json');
        assert.ok(fs.existsSync(snippetsPath), 'snippets.json must exist');

        const snippets = JSON.parse(fs.readFileSync(snippetsPath, 'utf8'));
        assert.ok(snippets['Main Function']);
        assert.ok(snippets['Function Declaration']);
        assert.ok(snippets['Struct Declaration']);
        assert.ok(snippets['Enum Declaration']);
        assert.ok(snippets['Match Expression']);
        assert.ok(snippets['For Range Loop']);

        for (const [name, snip] of Object.entries<any>(snippets)) {
            assert.ok(snip.prefix, `Snippet ${name} missing prefix`);
            assert.ok(snip.body, `Snippet ${name} missing body`);
        }
    });

    test('should validate package.json command contributions', () => {
        const pkgPath = path.resolve(__dirname, '../../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

        assert.equal(pkg.version, '0.3.0');
        const commands = pkg.contributes.commands.map((c: any) => c.command);
        assert.ok(commands.includes('rey.runFile'));
        assert.ok(commands.includes('rey.buildFile'));
        assert.ok(commands.includes('rey.checkFile'));
        assert.ok(commands.includes('rey.restartServer'));
    });
});
