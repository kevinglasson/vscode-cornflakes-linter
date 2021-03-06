'use strict';

import { workspace, Disposable, Diagnostic, DiagnosticSeverity, Range } from 'vscode';

import { LintingProvider, LinterConfiguration, Linter } from './utils/lintingProvider';

import * as os from 'os';

import * as path from 'path';

export default class Flake8LintingProvider implements Linter {

	public languageId = 'python';
	public settingsSection = 'cornflakes'

	public activate(subscriptions: Disposable[]) {
		let provider = new LintingProvider(this);
		provider.activate(subscriptions)
	}

	public loadConfiguration(): LinterConfiguration {
		let section = workspace.getConfiguration(this.settingsSection);
		if (!section) return;

		return {
			executable: section.get<string>('linter.executablePath', 'flake8'),
			fileArgs: [],
			bufferArgs: [],
			extraArgs: [],
			runTrigger: section.get<string>('linter.run', 'onSave')
		}
	}

	public process(lines: string[], filePath: string): Diagnostic[] {
		let diagnostics: Diagnostic[] = [];
		let violations: number = 0;

		violations = this.getViolations(lines);

		if (violations !== 0) {
			diagnostics = this.getDiagnostics(lines, filePath);
		} else {
			diagnostics = [];
		}

		return diagnostics

	}

	private getDiagnostics(lines: string[], filePath: string): Diagnostic[] {
		const lintRegex = /^(.+):(\d+):(\d+):\ (\S+\d+):?\ (.+)$/;

		// const filePathRegex = new RegExp(filePath);
		let diagnostics: Diagnostic[] = [];

		lines.forEach(line => {
			let matches = lintRegex.exec(line);
			// No errors found so return an empty list.
			if (matches === null) {
				return;
			}
			// Check that the the error is actually for the file we are 
			// processing, might need to change this in the future but for now
			// we can just || it with stdin.
			let matchFile = matches[1]
			if (matchFile === filePath || matchFile === "stdin") {
				diagnostics.push({
					range: new Range(parseInt(matches[2]) - 1, 0, parseInt(matches[2]) - 1, Number.MAX_VALUE),
					severity: DiagnosticSeverity.Information,
					message: matches[5],
					code: matches[4],
					source: 'cornflakes'
				});
			}
		});

		console.log(diagnostics);
		return diagnostics;
	}

	private getViolations(lines: string[]): number {
		const violationsRegex = /Found a total of \d+ violations and reported (\d+)$/;
		let violations: number = 0;

		lines.some(line => {
			const matches = violationsRegex.exec(line);
			if (matches !== null) {
				violations = parseInt(matches[1]);
				return true;
			}
		});
		return violations;
	}
}