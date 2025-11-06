'use strict';

import * as vscode from 'vscode';

import { isWebRuntime } from '../../util/runtime';
import { workspaceSymbolProviderPromise } from '../../util/factory';
import { runSamplePass } from '../../util/bench';
import { BASENAMES } from '../../util/files';
import { strictEqual } from '../../util/assert';
import { jsonify } from '../../util/jsonify';

suite('test/suite/workspace-symbol.test.ts - TextmateWorkspaceSymbolProvider class (src/workspace-symbol.ts)', function() {
	this.timeout(10000);

	this.beforeAll(function() {
		void vscode.window.showInformationMessage('TextmateWorkspaceSymbolProvider class (src/workspace-symbol.ts)');
	});

	test('TextmateWorkspaceSymbolProvider.provideWorkspaceSymbols(): Promise<vscode.SymbolInformation[]>', async function() {
		// Early exit + pass if we are in web runtime or testing .
		if (isWebRuntime || BASENAMES[globalThis.languageId].length === 1) {
			this.skip();
		}

		const symbols = await workspaceSymbolProviderResult();

		for (const symbol of symbols) {
			strictEqual(symbol.name.startsWith('obj.'), true, symbol.name);
			strictEqual(symbol.containerName === 'Animal', true, symbol.containerName || '');
			strictEqual(jsonify(symbol.location.uri) === './samples/Animal.m', true, jsonify(symbol.location.uri));

			const document = await vscode.workspace.openTextDocument(symbol.location.uri);
			const lineText = document.lineAt(symbol.location.range.start.line).text;
			strictEqual(lineText.includes(symbol.name.replace('obj.', '')), true, symbol.name);
		}
	});

	test('TextmateWorkspaceSymbolProvider.provideWorkspaceSymbols(): Promise<vscode.SymbolInformation[]>', async function() {
		// Early exit + pass if we are in web runtime or testing .
		if (isWebRuntime || BASENAMES[globalThis.languageId].length === 1) {
			this.skip();
		}

		const symbols = await workspaceSymbolProviderResult();
		await runSamplePass('workspace-symbol', 'index', symbols);
	});
});

async function workspaceSymbolProviderResult() {
	const workspaceSymbolProvider = await workspaceSymbolProviderPromise;
	const symbols = await workspaceSymbolProvider.provideWorkspaceSymbols('obj.');
	return symbols;
}
