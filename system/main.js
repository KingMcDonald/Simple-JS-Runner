const outputDiv = document.getElementById('output');
const clearBtn = document.getElementById('clear-btn');
const runBtn = document.getElementById('run-btn');
const feedbackDiv = document.getElementById('feedback');
// Store all output entries
let outputEntries = [];

// Options menu logic
const optionsBtn = document.getElementById('options-btn');
const optionsMenu = document.querySelector('.options-menu');
const optionsDropdown = document.getElementById('options-dropdown');
const autoRunCheck = document.getElementById('auto-run-check');
const autoClearCheck = document.getElementById('auto-clear-check');
const darkModeCheck = document.getElementById('dark-mode-check');

// Persist settings in localStorage
function saveSettings() {
    localStorage.setItem('jsrunner-settings', JSON.stringify({
        autoRun: autoRunCheck.checked,
        autoClear: autoClearCheck.checked,
        darkMode: darkModeCheck.checked
    }));
}
function loadSettings() {
    const s = JSON.parse(localStorage.getItem('jsrunner-settings') || '{}');
    autoRunCheck.checked = !!s.autoRun;
    autoClearCheck.checked = !!s.autoClear;
    darkModeCheck.checked = !!s.darkMode;
    if (s.darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
}

optionsBtn.addEventListener('click', e => {
    optionsMenu.classList.toggle('open');
    e.stopPropagation();
});
document.addEventListener('click', e => {
    optionsMenu.classList.remove('open');
});
optionsDropdown.addEventListener('click', e => e.stopPropagation());
autoRunCheck.addEventListener('change', saveSettings);
autoClearCheck.addEventListener('change', saveSettings);
darkModeCheck.addEventListener('change', () => {
    if (darkModeCheck.checked) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    saveSettings();
});
loadSettings();

function renderOutput() {
    outputDiv.innerHTML = '';
    outputEntries.forEach(entry => {
        // Remove accidental 'log' label output
        if (entry.text === 'log' && entry.type === 'log') return;
        const row = document.createElement('div');
        row.className = `output-entry ${entry.type}`;
        const type = document.createElement('span');
        type.className = 'output-type';
        type.textContent = entry.type;
        const content = document.createElement('span');
        content.className = 'output-content';
        content.textContent = entry.text;
        row.appendChild(type);
        row.appendChild(content);
        outputDiv.appendChild(row);
    });
}

let lastRunTime = null;
// Eloquent JavaScript suggestions (title and page number, all +12 for front matter)
const eloquentSuggestions = [
    { title: 'Introduction', page: 13 },
    { title: 'Values, Types, and Operators', page: 27 },
    { title: 'Program Structure', page: 41 },
    { title: 'Functions', page: 49 },
    { title: 'Data Structures: Objects and Arrays', page: 69 },
    { title: 'Higher-Order Functions', page: 91 },
    { title: 'The Secret Life of Objects', page: 113 },
    { title: 'Project: A Robot', page: 135 },
    { title: 'Bugs and Error Handling', page: 157 },
    { title: 'Regular Expressions', page: 179 },
    { title: 'Modules', page: 201 },
    { title: 'Asynchronous Programming', page: 223 },
    { title: 'Project: Skill-Sharing Website', page: 245 },
    { title: 'JavaScript and the Browser', page: 267 },
    { title: 'The Document Object Model', page: 289 },
    { title: 'Handling Events', page: 311 },
    { title: 'Project: Platform Game', page: 333 },
    { title: 'Drawing on Canvas', page: 355 },
    { title: 'HTTP and Forms', page: 377 },
    { title: 'Project: A Paint Program', page: 399 },
    { title: 'Node.js', page: 421 },
    { title: 'Project: Skill-Sharing Website (Node.js)', page: 443 },
    { title: 'Memory and Performance', page: 465 },
    { title: 'Debugging', page: 487 },
    { title: 'Functional Programming', page: 509 },
    { title: 'Promises and Async/Await', page: 531 },
    { title: 'Web Storage', page: 553 },
    { title: 'JSON', page: 575 },
    { title: 'Error Handling Patterns', page: 597 },
    { title: 'Testing', page: 619 },
    { title: 'Best Practices', page: 641 }
];

function setFeedback({status, message, details, type = 'info', suggestions = [], execTime = null, codeHints = [], quickActions = []}) {
    feedbackDiv.innerHTML = '';
    const statusEl = document.createElement('div');
    statusEl.className = 'fb-status ' + type;
    statusEl.textContent = status;
    feedbackDiv.appendChild(statusEl);
    if (message) {
        const msgEl = document.createElement('div');
        msgEl.className = 'fb-message';
        msgEl.textContent = message;
        feedbackDiv.appendChild(msgEl);
    }
    if (execTime !== null) {
        const timeEl = document.createElement('div');
        timeEl.className = 'fb-exectime';
        timeEl.textContent = `Execution time: ${execTime.toFixed(2)} ms`;
        feedbackDiv.appendChild(timeEl);
    }
    if (details) {
        const detEl = document.createElement('pre');
        detEl.className = 'fb-details';
        detEl.textContent = details;
        // Add copy button for error details
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy Error';
        copyBtn.className = 'fb-copy-btn';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(details);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy Error', 1200);
        };
        detEl.appendChild(document.createElement('br'));
        detEl.appendChild(copyBtn);
        feedbackDiv.appendChild(detEl);
    }
    if (suggestions && suggestions.length) {
        const sugEl = document.createElement('ul');
        sugEl.className = 'fb-suggestions';
        suggestions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            sugEl.appendChild(li);
        });
        feedbackDiv.appendChild(sugEl);
    }
    // Replace code hints with a random Eloquent JS suggestion
    if (eloquentSuggestions.length) {
        // Remove any existing .fb-hints to prevent duplicates
        const oldHints = feedbackDiv.querySelectorAll('.fb-hints');
        oldHints.forEach(el => el.remove());

        // Guard to ensure only one hints list is ever appended per feedback update
        let hintsAppended = false;

        fetch('../input.js?cache=' + Date.now())
            .then(resp => resp.text())
            .then(code => {
                // Remove comments and string literals for more accurate detection
                let codeForDetection = code
                    .replace(/\/\*.*?\*\//gs, '') // block comments
                    .replace(/\/\/.*$/gm, '') // line comments
                    .replace(/(['"])(?:\\.|[^\\])*?\1/g, ''); // string literals

                // Advanced topic detection: frequency, context, and code structure
                const topics = [
                    {patterns: [/\bfunction\b/g, /=>/g], title: 'Functions', page: 49, weight: 2},
                    {patterns: [/\basync\b/g, /\bawait\b/g, /Promise/g], title: 'Asynchronous Programming', page: 223, weight: 3},
                    {patterns: [/\bclass\s+\w+/g], title: 'The Secret Life of Objects', page: 113, weight: 3},
                    {patterns: [/\bArray\b/g, /\[.*\]/g, /\.map\(/g, /\.filter\(/g, /\.reduce\(/g], title: 'Data Structures: Arrays', page: 69, weight: 2},
                    {patterns: [/\bObject\b/g, /\{.*\}/g, /Object\.keys/g, /Object\.values/g, /Object\.entries/g], title: 'Data Structures: Objects', page: 69, weight: 2},
                    {patterns: [/new Set\b/g, /\bSet\s*\(/g], title: 'Sets', page: 69, weight: 2},
                    {patterns: [/new Map\b/g, /\bMap\s*\(/g], title: 'Maps', page: 69, weight: 2},
                    {patterns: [/try\s*\{/g, /catch\s*\(/g, /throw\b/g, /Error\b/g], title: 'Bugs and Error Handling', page: 157, weight: 2},
                    {patterns: [/[^\w]\/[^\w]/g, /RegExp\b/g], title: 'Regular Expressions', page: 179, weight: 2},
                    {patterns: [/canvas/gi], title: 'Drawing on Canvas', page: 355, weight: 2},
                    {patterns: [/\bfetch\b/g, /XMLHttpRequest/g, /ajax/gi], title: 'HTTP and Forms', page: 377, weight: 2},
                    {patterns: [/addEventListener/g, /dispatchEvent/g, /CustomEvent/g], title: 'Handling Events', page: 311, weight: 2},
                    {patterns: [/node\./gi, /require\(/g, /module\.exports/g], title: 'Node.js', page: 421, weight: 2},
                    {patterns: [/import\s+/g, /export\s+/g], title: 'Modules', page: 201, weight: 2},
                    {patterns: [/document\./g, /window\./g], title: 'The Document Object Model', page: 289, weight: 2},
                    {patterns: [/localStorage/g, /sessionStorage/g], title: 'Web Storage', page: 553, weight: 2},
                    {patterns: [/JSON\.parse/g, /JSON\.stringify/g], title: 'JSON', page: 575, weight: 2},
                    {patterns: [/performance\./g, /memory/gi], title: 'Memory and Performance', page: 465, weight: 2},
                    {patterns: [/test\(/g, /assert/g], title: 'Testing', page: 619, weight: 2},
                    {patterns: [/debugger/g, /console\.debug/g], title: 'Debugging', page: 487, weight: 2},
                    {patterns: [/function\s*\(/g, /=>/g, /map\(/g], title: 'Functional Programming', page: 509, weight: 2},
                    {patterns: [/catch\(/g, /try\{/g], title: 'Error Handling Patterns', page: 597, weight: 2},
                    {patterns: [/best practice/gi, /clean code/gi], title: 'Best Practices', page: 641, weight: 2}
                ];
                let best = null;
                let bestScore = 0;
                if (codeForDetection && codeForDetection.replace(/\s/g, '').length > 0) {
                    for (const t of topics) {
                        let score = 0;
                        for (const pat of t.patterns) {
                            const matches = codeForDetection.match(pat);
                            if (matches) score += matches.length * (t.weight || 1);
                        }
                        // Prefer topics with more unique patterns matched
                        const uniquePatterns = t.patterns.filter(pat => codeForDetection.match(pat));
                        score += uniquePatterns.length;
                        if (score > bestScore) {
                            best = t;
                            bestScore = score;
                        }
                    }
                }
                // Pick a random suggestion that is NOT the same as the detected topic
                let suggestion;
                const usedTitle = best ? best.title : null;
                const filtered = eloquentSuggestions.filter(s => s.title !== usedTitle);
                if (filtered.length > 0) {
                    suggestion = filtered[Math.floor(Math.random() * filtered.length)];
                } else {
                    suggestion = eloquentSuggestions[Math.floor(Math.random() * eloquentSuggestions.length)];
                }

                // Only append if not already appended (guard against async race)
                if (!hintsAppended && !feedbackDiv.querySelector('.fb-hints')) {
                    hintsAppended = true;
                    const hintEl = document.createElement('ul');
                    hintEl.className = 'fb-hints';
                    // Context-aware suggestion first
                    if (best) {
                        const li2 = document.createElement('li');
                        const a2 = document.createElement('a');
                        a2.href = `../assets/Eloquent_JavaScript.pdf#page=${best.page}&view=FitH`;
                        a2.target = '_blank';
                        a2.textContent = `Learn More About (${best.title})`;
                        a2.className = 'fb-learn-link';
                        li2.appendChild(a2);
                        hintEl.appendChild(li2);
                    }
                    // Random suggestion (never duplicate the context-aware one)
                    if (suggestion) {
                        const li1 = document.createElement('li');
                        const a1 = document.createElement('a');
                        a1.href = `../assets/Eloquent_JavaScript.pdf#page=${suggestion.page}&view=FitH`;
                        a1.target = '_blank';
                        a1.textContent = `Learn More (${suggestion.title})`;
                        a1.className = 'fb-learn-link';
                        li1.appendChild(a1);
                        hintEl.appendChild(li1);
                    }
                    feedbackDiv.appendChild(hintEl);
                }
            });
    }
    if (quickActions && quickActions.length) {
        const qaDiv = document.createElement('div');
        qaDiv.className = 'fb-quick-actions';
        quickActions.forEach(action => {
            const btn = document.createElement('button');
            btn.textContent = action.label;
            btn.className = 'fb-quick-btn';
            btn.onclick = action.onClick;
            qaDiv.appendChild(btn);
        });
        feedbackDiv.appendChild(qaDiv);
    }
    if (lastRunTime) {
        const lastRunEl = document.createElement('div');
        lastRunEl.className = 'fb-last-run';
        lastRunEl.textContent = `Last run: ${lastRunTime}`;
        feedbackDiv.appendChild(lastRunEl);
    }
}


function appendOutput(type, ...args) {
    const text = args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
    }).join(' ');
    outputEntries.push({ type, text });
    renderOutput();
    outputDiv.scrollTop = outputDiv.scrollHeight;

    // Advanced feedback: show errors/warnings in feedback
    if (type === 'error') {
        setFeedback({
            status: 'Execution Error',
            message: args[0]?.message || String(args[0]),
            details: args[0]?.stack || '',
            type: 'error',
            suggestions: [
                'Check your code for typos or syntax errors.',
                'Use console.log to debug values.',
                'Refer to the error details above.'
            ]
        });
    } else if (type === 'warn') {
        setFeedback({
            status: 'Warning',
            message: args.map(String).join(' '),
            type: 'warn',
            suggestions: [
                'Warnings do not stop execution, but review your code.'
            ]
        });
    }
}

// Patch console methods
['log', 'warn', 'error', 'info'].forEach(type => {
    const orig = console[type].bind(console);
    console[type] = (...args) => {
        orig(...args);
        appendOutput(type, ...args);
    };
});

window.addEventListener('error', function(e) {
    appendOutput('error', e.error || e.message || e);
});
window.addEventListener('unhandledrejection', function(e) {
    appendOutput('error', e.reason || e);
});


clearBtn.addEventListener('click', () => {
    outputEntries = [];
    renderOutput();
    setFeedback({status: 'Output Cleared', message: 'The output area has been cleared.', type: 'info'});
});


// Directly run code in main context (no sandbox)
function analyzeCodeHints(code) {
    const hints = [];
    if (!/console\.log/.test(code)) {
        hints.push({text:'Tip: Use console.log to print output for debugging.', link:'https://developer.mozilla.org/en-US/docs/Web/API/console/log'});
    }
    if (/var /.test(code)) {
        hints.push({text:'Consider using let/const instead of var for variable declarations.', link:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let'});
    }
    if (/document\.write/.test(code)) {
        hints.push({text:'Avoid using document.write in modern web apps.', link:'https://developer.mozilla.org/en-US/docs/Web/API/Document/write'});
    }
    if (/alert\s*\(/.test(code)) {
        hints.push({text:'Avoid using alert() for user feedback; use the output area instead.'});
    }
    if (/while\s*\(true\)/.test(code)) {
        hints.push({text:'Infinite loops (while(true)) can freeze the browser.'});
    }
    // Unused variable detection (simple heuristic)
    const varMatches = code.match(/(?:let|const|var)\s+(\w+)/g) || [];
    varMatches.forEach(decl => {
        const varName = decl.split(/\s+/)[1];
        const usage = new RegExp(`[^\w\.]${varName}[^\w]`, 'g');
        if (code.match(usage) === null || code.match(usage).length < 2) {
            hints.push({text:`Variable '${varName}' is declared but not used.`});
        }
    });
    // Function count
    const funcCount = (code.match(/function\s+\w+|=>/g) || []).length;
    if (funcCount > 3) {
        hints.push({text:`You have ${funcCount} functions. Consider splitting code into modules for maintainability.`});
    }
    // ES6+ features
    if (/=>/.test(code)) {
        hints.push({text:'Arrow functions detected. Good use of ES6+ features!'});
    }
    if (/\bclass\b/.test(code)) {
        hints.push({text:'Class syntax detected. Consider using OOP patterns if appropriate.'});
    }
    return hints;
}

function runInputCode(code) {
    let execTime = null;
    let codeHints = analyzeCodeHints(code);
    const quickActions = [
        {label: 'Clear Output', onClick: () => { outputEntries = []; renderOutput(); setFeedback({status: 'Output Cleared', message: 'The output area has been cleared.', type: 'info'}); }},
        {label: 'Run Again', onClick: () => { setFeedback({status: 'Running', message: 'Your code is executing...', type: 'info', codeHints}); runInputCode(code); }}
    ];
    try {
        if (autoClearCheck && autoClearCheck.checked) {
            outputEntries = [];
            renderOutput();
        }
        setFeedback({status: 'Running', message: 'Your code is executing...', type: 'info', codeHints, quickActions});
        const t0 = performance.now();
        // eslint-disable-next-line no-eval
        eval(code);
        const t1 = performance.now();
        execTime = t1 - t0;
        lastRunTime = new Date().toLocaleTimeString();
        setFeedback({status: 'Success', message: 'Code executed successfully.', type: 'success', execTime, codeHints, quickActions});
    } catch (e) {
        setFeedback({
            status: 'Execution Error',
            message: e.message || String(e),
            details: e.stack || '',
            type: 'error',
            suggestions: [
                'Check your code for typos or syntax errors.',
                'Use console.log to debug values.',
                'Refer to the error details above.'
            ],
            codeHints,
            quickActions
        });
        appendOutput('error', e);
    }
}

// Load input.js as text and run in main context
async function loadAndRunInput() {
    try {
        const resp = await fetch('../input.js?cache=' + Date.now());
        if (!resp.ok) throw new Error('input.js not found');
        const code = await resp.text();
        runInputCode(code);
    } catch (err) {
        appendOutput('error', err);
    }
}

// Auto-reload using File System Access API (if supported)
if ('showOpenFilePicker' in window && 'FileSystemHandle' in window) {
    // Optional: prompt user to pick input.js for live reload
    // Not implemented for simplicity, but can be added
    // See https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
}

// Only run code on refresh if auto-run is checked, and only run once
window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setFeedback({
        status: 'Ready',
        message: 'Edit input.js and click Run or save to execute.',
        type: 'info',
        codeHints: [
            'You can use console.log to print output.',
            'Errors and warnings will appear here.',
            'Execution time and last run will be shown after running.'
        ]
    });
    outputEntries = [];
    renderOutput();
    if (autoRunCheck && autoRunCheck.checked) {
        loadAndRunInput();
    }
});

// Run button handler
runBtn.addEventListener('click', () => {
    outputEntries = [];
    renderOutput();
    setFeedback({status: 'Running', message: 'Your code is executing...', type: 'info'});
    loadAndRunInput();
});