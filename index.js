function getSpanForFile(data, dir) {
  const span = document.createElement('span');
  span.className = 'filename';
  const a = document.createElement('a');
  a.textContent = dir ? data.path.substring(dir.length+1) : data.path;
  a.href = '#' + data.path;
  span.appendChild(a);
  return span;
}

async function graphHistory(path) {
  // Backend needs path without ending /
  if (path && path.endsWith('/')) {
    path = path.substring(0, path.length-1);
  }

  let data = await get_history(path);

  let trace = {
    x: data.map(push => new Date(push.date * 1000)),
    y: data.map(push => push.coverage),
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Coverage %'
  };

  let layout = {
    title:'Coverage history for ' + (path || 'full repository')
  };

  Plotly.newPlot('history', [ trace ], layout);
}

async function showDirectory(dir, files) {
  graphHistory(dir);

  const columns = [['File name', x => getSpanForFile(x, dir)],
                   ['Children', x => getSpanForValue(x.children)],
                   ['Coverage', x => getSpanForValue(x.coveragePercent + ' %')]];

  const output = document.createElement('div');
  output.id = 'output';
  output.className = 'directory';

  // Create menu with navbar
  const menu = document.createElement('h2');
  menu.appendChild(navbar(dir));
  let title = document.createElement('span');
  title.textContent = ' : ' + files.length + ' directories/files';
  menu.appendChild(title)
  output.appendChild(menu);

  const table = document.createElement('div');
  table.className = 'table';

  const header = document.createElement('div');
  header.className = 'header';
  columns.forEach(([name, ]) => {
    const span = getSpanForValue(name);
    if (name === 'File name') {
      span.className = 'filename';
    }
    header.append(span);
  });
  table.append(header);

  for (const file of files) {
    const entryElem = document.createElement('div');
    entryElem.className = 'row';
    columns.forEach(([, func]) => {
      entryElem.append(func(file));
    });
    table.appendChild(entryElem);
  }
  output.appendChild(table);
  document.getElementById('output').replaceWith(output);
}

async function showFile(file) {
  let source = await get_source(file.path);

  let language;
  if (file.path.endsWith('cpp') || file.path.endsWith('h')) {
    language = 'cpp';
  } else if (file.path.endsWith('c')) {
    language = 'c';
  } else if (file.path.endsWith('js') || file.path.endsWith('jsm')) {
    language = 'javascript';
  } else if (file.path.endsWith('css')) {
    language = 'css';
  } else if (file.path.endsWith('py')) {
    language = 'python';
  } else if (file.path.endsWith('java')) {
    language = 'java';
  }

  const changeset = await get_latest();

  const output = document.createElement('div');
  output.id = 'output';
  output.className = 'file';
  output.appendChild(navbar(file.path));

  const table = document.createElement('table');
  table.id = 'file';
  table.style.borderCollapse = 'collapse';
  table.style.borderSpacing = 0;
  const tbody = document.createElement('tbody');
  tbody.style.border = 'none';
  table.appendChild(tbody);

  for (let [lineNumber, lineText] of source.split('\n').entries()) {
    const tr = document.createElement('tr');
    tbody.appendChild(tr);

    const lineNumberTd = document.createElement('td');
    lineNumberTd.textContent = lineNumber;
    tr.appendChild(lineNumberTd);

    const lineTextTd = document.createElement('td');
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    pre.appendChild(code);
    lineTextTd.appendChild(pre);
    tr.appendChild(lineTextTd);

    if (lineText) {
      code.textContent = lineText;
    } else {
      code.textContent = ' ';
    }

    code.classList.add(`lang-${language}`);
    Prism.highlightElement(code);

    if (file.coverage[lineNumber] != -1) {
      let cssClass = (file.coverage[lineNumber] > 0) ? 'covered' : 'uncovered';
      tr.classList.add(cssClass);
    }
  }

  output.appendChild(table);
  document.getElementById('output').replaceWith(output);
  document.getElementById('history').innerHTML = '';

  /*const pre = document.createElement('pre');
  const code = document.createElement('code');
  pre.appendChild(code);
  pre.classList.add('lang-cpp');
  pre.classList.add('line-numbers');

  code.textContent = source;

  await new Promise(resolve => Prism.highlightElement(pre, true, resolve));

  document.getElementById('output').replaceWith(pre);*/
}

async function generate() {
  const path = window.location.hash.substring(1);

  const data = await get_path_coverage(path);

  if (data.type == 'directory') {
    await showDirectory(path, data.children);
  } else if (data.type === 'file') {
    await showFile(data);
  }
}

main(generate, []);
