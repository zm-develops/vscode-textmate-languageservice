'use strict';

import * as vscodeTextmate from 'vscode-textmate';

import { ServiceBase } from '../util/service';

import type * as vscode from 'vscode';
import type { Mutable } from 'type-fest';

export interface TextmateToken extends Mutable<vscodeTextmate.IToken> {
	level: number;
	line: number;
	text: string;
	type: string;
}

export interface TextmateTokenizeLineResult extends Omit<vscodeTextmate.ITokenizeLineResult, 'tokens'> {
	readonly tokens: TextmateToken[];
}

export class TokenizerService extends ServiceBase<TextmateToken[]> {
	constructor(
		private _grammar: vscodeTextmate.IGrammar
	) {
		super();
	}

	public async parse(document: vscode.TextDocument): Promise<TextmateToken[]> {
		const tokens: TextmateToken[] = [];

		let prevState = vscodeTextmate.INITIAL;
		let indentChar = '';

		for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
			const line: vscode.TextLine = document.lineAt(lineNumber);
			if (!indentChar.length && line.firstNonWhitespaceCharacterIndex > 0) {
				indentChar = line.text.substring(0, line.firstNonWhitespaceCharacterIndex);
			}
			const level = !indentChar.length
				? 0
				: Math.floor(line.firstNonWhitespaceCharacterIndex / indentChar.length);
			const lineResult = this._grammar.tokenizeLine(line.text, prevState) as TextmateTokenizeLineResult;
			prevState = lineResult.ruleStack;

			for (const token of lineResult.tokens) {
				token.type = token.scopes[token.scopes.length - 1];
				token.text = line.text.substring(token.startIndex, token.endIndex);
				token.line = lineNumber;
				token.level = level;
			}

			tokens.push(...lineResult.tokens);
		}

		return Promise.resolve(tokens);
	}
}
