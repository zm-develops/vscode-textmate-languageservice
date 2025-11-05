'use strict';

import * as vscode from 'vscode';
import { TextmateScopeSelector } from './util/selectors';
import type { ConfigData } from './config';
import type { TextmateToken, TokenizerService } from './services/tokenizer';
import type { OutlineEntry, OutlineService } from './services/outline';
import type { IndentationService } from './services/indentation';

const rangeLimit = 5000;
const commentScopeSelector = new TextmateScopeSelector('comment');
const importScopeSelector = new TextmateScopeSelector('import');

export interface FoldingToken {
	isStart: boolean;
	level: number;
	/** Line number - zero-indexed. */
	line: number;
	type: string;
}

export class TextmateFoldingRangeProvider implements vscode.FoldingRangeProvider {
	constructor(
		private _config: ConfigData,
		private _tokenService: TokenizerService,
		private _indentationService: IndentationService,
		private _outlineService: OutlineService
	) {}

	public async provideFoldingRanges(
		document: vscode.TextDocument,
		_: vscode.FoldingContext,
		_token: vscode.CancellationToken
	): Promise<vscode.FoldingRange[]> {
		const tokens = await this._tokenService.fetch(document);
		const levels = await this._indentationService.fetch(document);
		const outline = await this._outlineService.fetch(document);

		const foldables = await Promise.all([
			this.getRegions(tokens, levels),
			this.getHeaderFoldingRanges(tokens, levels, document, outline),
			this.getBlockFoldingRanges(tokens, levels)
		]);

		const results: vscode.FoldingRange[] = [];
		return results.concat(...foldables).slice(0, rangeLimit);
	}

	private getRegions(tokens: TextmateToken[], levels: number[]): vscode.FoldingRange[] {
		const regions = tokens.filter(this.isRegion.bind(this) as typeof this.isRegion, this);
		const markers = regions.map(function(this: TextmateFoldingRangeProvider, token, index): FoldingToken {
			return {
				isStart: this.isStartRegion(token),
				level: levels[index],
				line: token.line,
				type: token.type
			};
		}, this);

		const stack: FoldingToken[] = [];
		const ranges: vscode.FoldingRange[] = [];

		for (const marker of markers) {
			if (marker.isStart) {
				stack.push(marker);
			} else if (stack.length && stack[stack.length - 1].isStart) {
				const start = stack.pop()!.line;
				const end = marker.line;
				const kind = vscode.FoldingRangeKind.Region;
				ranges.push(new vscode.FoldingRange(start, end, kind));
			} else {
				// noop: invalid nesting (i.e. [end, start] or [start, end, end])
			}
		}

		return ranges;
	}

	private getHeaderFoldingRanges(tokens: TextmateToken[], levels: number[], document: vscode.TextDocument, outline: OutlineEntry[]) {
		const sections = outline.filter(isSectionEntry, this);
		const ranges: vscode.FoldingRange[] = [];

		for (let index = 1; index < sections.length; index++) {
			const section = sections[index];
			const startLine = section.line;
			let endLine = sections.hasOwnProperty(index + 1)
				? sections[index + 1].line - 1
				: document.lineCount - 1;

			const dedentRange = tokens.slice(section.anchor + 1, sections[index + 1]?.anchor);
			const dedentLevels = levels.slice(section.anchor + 1, sections[index + 1]?.anchor);
			const dedentToken = dedentRange.find(function(token: TextmateToken, subindex: number): boolean {
				return token.line > startLine && token.line < endLine && dedentLevels[subindex] < section.level;
			});
			if (dedentToken) {
				endLine = dedentToken.line - 1;
			}
			while (document.lineAt(endLine).isEmptyOrWhitespace && endLine >= startLine + 1) {
				endLine--;
			}

			ranges.push(new vscode.FoldingRange(startLine, endLine));
		}

		return ranges;
	}

	private getBlockFoldingRanges(tokens: TextmateToken[], levels: number[]): vscode.FoldingRange[] {
		const bounds: TextmateToken[] = tokens.filter(isBlockBoundary.bind(null, tokens, levels));
		const markers = bounds.map(function(bound): FoldingToken {
			const index = tokens.indexOf(bound);
			return {
				isStart: levels[index + 1] > levels[index],
				level: levels[index],
				line: bound.line,
				type: bound.type
			};
		});

		const stack: FoldingToken[] = [];
		const ranges: vscode.FoldingRange[] = [];

		for (const marker of markers) {
			const last = stack[stack.length - 1];
			if (marker.isStart) {
				stack.push(marker);
			} else if (last && last.isStart) {
				const previous = stack.pop();
				let start = previous.line;
				let end = marker.line;

				// Increment patch for `level=0&line!=0` - see #4
				if (previous.level === 0 && previous.line !== 0) {
					start += 1;
					end += 1;
				}

				const kind = this.getTokenFoldingRangeKind(marker);
				ranges.push(new vscode.FoldingRange(start, end, kind));
			} else {
				// noop: invalid nesting (i.e. [end, start] or [start, end, end])
			}
		}

		return ranges;
	}

	private getTokenFoldingRangeKind(token: FoldingToken): vscode.FoldingRangeKind | undefined {
		switch (true) {
			case commentScopeSelector.match(token.type):
				return vscode.FoldingRangeKind.Comment;
			case importScopeSelector.match(token.type):
				return vscode.FoldingRangeKind.Imports;
			default:
				return void 0;
		}
	}

	private isComment(token: TextmateToken): boolean {
		return /(?:^| )comment(?: |$)/.test(token.scopes.join(' '));
	}

	private isRegion(this: TextmateFoldingRangeProvider, token: TextmateToken): boolean {
		return this.isComment(token) && (this.isStartRegion(token) || this.isEndRegion(token));
	}

	private isStartRegion(this: TextmateFoldingRangeProvider, token: TextmateToken): boolean {
		return this._config.selectors.markers.start.test(token.text);
	}

	private isEndRegion(this: TextmateFoldingRangeProvider, token: TextmateToken): boolean {
		return this._config.selectors.markers.end.test(token.text);
	}
}

function isBlockBoundary(tokens: TextmateToken[], levels: number[], _token: TextmateToken, index: number) {
	return index !== tokens.length - 1 && levels[index + 1] !== levels[index];
}

function isSectionEntry(entry: OutlineEntry): boolean {
	return entry.type === vscode.SymbolKind.String;
}
