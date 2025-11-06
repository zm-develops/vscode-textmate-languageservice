'use strict';

import * as vscode from 'vscode';

import { documentServicePromise, documentSymbolProviderPromise } from '../../util/factory';
import { BASENAMES, EXTENSIONS, getSampleFileUri } from '../../util/files';
import { runSamplePass } from '../../util/bench';
import { strictEqual } from '../../util/assert';

suite('test/suite/document-symbol.test.ts - TextmateDocumentSymbolProvider class (src/document-symbol.ts)', function() {
	this.timeout(10000);

	this.beforeAll(function() {
		void vscode.window.showInformationMessage('TextmateDocumentSymbolProvider class (src/document-symbol.ts)');
	});

	test('TextmateDocumentSymbolProvider.provideDocumentSymbols(): Promise<[vscode.DocumentSymbol, ...vscode.DocumentSymbol]>', async function() {
		if (BASENAMES[globalThis.languageId].length === 1) {
			this.skip();
		}

		const samples = await documentSymbolProviderResult();
		for (let index = 0; index < samples.length; index++) {
			const basename = BASENAMES[globalThis.languageId][index];
			const title = samples[index][0];

			strictEqual(title.name === basename, true, basename + EXTENSIONS[globalThis.languageId]);
		}
	});

	test('TextmateDocumentSymbolProvider.provideDocumentSymbols(): Promise<vscode.DocumentSymbol[]>', async function() {
		const samples = await documentSymbolProviderResult();

		let error: TypeError | void = void 0;
		for (let index = 0; index < samples.length; index++) {
			const basename = BASENAMES[globalThis.languageId][index];
			const symbols = samples[index];

			try {
				await runSamplePass('document-symbol', basename, symbols);
			} catch (e) {
				error = typeof error !== 'undefined' ? error : e as Error;
			}
		}
		if (error) {
			throw error;
		}
	});
});

async function documentSymbolProviderResult() {
	const samples = BASENAMES[globalThis.languageId].map(getSampleFileUri);

	const documentService = await documentServicePromise;
	const documentSymbolProvider = await documentSymbolProviderPromise;
	const results: vscode.DocumentSymbol[][] = [];

	for (const resource of samples) {
		const document = await documentService.getDocument(resource);

		const symbols = await documentSymbolProvider.provideDocumentSymbols(document);

		results.push(symbols);
	}

	return results;
}
