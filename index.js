'use strict';
const logUpdate = require('log-update');
const chalk = require('chalk');
const figures = require('figures');
const indentString = require('indent-string');
const cliTruncate = require('cli-truncate');
const stripAnsi = require('strip-ansi');
const utils = require('./lib/utils');

const renderHelper = (tasks, options, level) => {
	level = level || 0;

	let output = [];

	for (const task of tasks) {
		if (!options.showNextTasks && task.state === 'unknown') continue;

		const disabled = !task.isEnabled() ? ` ${chalk.dim('[disabled]')}`: '';
		const skipped = task.isSkipped() ? ` ${chalk.dim('[skipped]')}` : '';

		const out = indentString(` ${utils.getSymbol(task, options)} ${task.title}${disabled}${skipped}`, level, '  ');
		output.push(cliTruncate(out, process.stdout.columns));

		if ((!options.collapse || (task.isPending() || !task.isEnabled() || task.isSkipped() || task.hasFailed())) && utils.isDefined(task.output)) {
			let data = String(task.output).trim().split('\n').map(stripAnsi).filter(Boolean);

			if (data.length) {
				data.forEach ( datum => {
					const out = indentString(`${figures.arrowRight} ${datum}`, level, '  ');
					output.push(`   ${chalk.gray(cliTruncate(out, process.stdout.columns - 3))}`);
				});
			}
		}

		if ((task.isPending() || task.hasFailed() || options.collapse === false) && (task.hasFailed() || options.showSubtasks !== false) && task.subtasks.length > 0) {
			output = output.concat(renderHelper(task.subtasks, options, level + 1));
		}
	}

	return output.join('\n');
};

const render = (tasks, options) => {
	logUpdate(renderHelper(tasks, options));
};

class UpdateRenderer {

	constructor(tasks, options) {
		this._tasks = tasks;
		this._options = Object.assign({
			showNextTasks: true,
			showSubtasks: true,
			collapse: true,
			clearOutput: false
		}, options);
	}

	render() {
		if (this._id) {
			// Do not render if we are already rendering
			return;
		}

		this._id = setInterval(() => {
			render(this._tasks, this._options);
		}, 100);
	}

	end(err) {
		if (this._id) {
			clearInterval(this._id);
			this._id = undefined;
		}

		render(this._tasks, this._options);

		if (this._options.clearOutput && err === undefined) {
			logUpdate.clear();
		} else {
			logUpdate.done();
		}
	}
}

module.exports = UpdateRenderer;
