async function graphHistory(history, path) {
  if (history === null) {
    message('warning', `No history data for ${path}`);
    return;
  }

  let trace = {
    x: history.map(push => new Date(push.date * 1000)),
    y: history.map(push => push.coverage),
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Coverage %'
  };

  let layout = {
    title:'Coverage history for ' + (path || 'mozilla-central')
  };

  show('history');
  Plotly.newPlot('history', [ trace ], layout);
}

async function showDirectory(dir, revision, files) {
  let context = {
    navbar: build_navbar(dir, revision),
    files: files,
    revision: revision || REV_LATEST,
    file_name: function(){
      // Build filename relative to current dir
      return dir ? this.path.substring(dir.length+1) : this.path;
    }
  };
  render('browser', context, 'output');
}

async function showFile(file, revision) {
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

  let context = {
    navbar: build_navbar(file.path, revision),
    language: language,
    lines: source.split('\n').map((line, nb) => {
      let coverage = file.coverage[nb];
      let css_class = '';
      if (coverage !== -1) {
        css_class = coverage > 0 ? 'covered': 'uncovered';
      }
      return {
        nb: nb,
        line: line || ' ',
        covered: css_class,
      }
    }),
  };

  hide('message');
  hide('history');
  let output = render('file_coverage', context, 'output');

  // Highlight source code once displayed
  Prism.highlightAll(output);
}

function readHash() {
  // Reads changeset & path from current URL hash
  let hash = window.location.hash.substring(1);
  let pos = hash.indexOf(':');
  if (pos === -1) {
    return ['', ''];
  }
  return [
    hash.substring(0, pos),
    hash.substring(pos+1),
  ]
}

function updateHash(newChangeset, newPath) {
  // Set the URL hash with both changeset & path
  let [changeset, path] = readHash();
  changeset = newChangeset || changeset || REV_LATEST;
  path = newPath || path || '';
  window.location.hash = '#' + changeset + ':' + path;
}

async function generate() {
  let [revision, path] = readHash();

  // Reset display
  hide('history');
  hide('output');
  message('loading', 'Loading coverage data for ' + (path || 'mozilla-central') + ' @ ' + (revision || REV_LATEST));

  // Also update the revision element
  if (revision != REV_LATEST) {
    let input = document.getElementById('revision');
    input.value = revision;
  }

  try {
    var [coverage, history] = await Promise.all([
      get_path_coverage(path, revision),
      get_history(path),
    ]);
  } catch (err) {
    message('error', 'Failed to load coverage: ' + err.message);
    return;
  }

  if (coverage.type === 'directory') {
    hide('message');
    await graphHistory(history, path);
    await showDirectory(path, revision, coverage.children);
  } else if (coverage.type === 'file') {
    await showFile(coverage, revision);
  } else {
    message('error', 'Invalid file type: ' + date.type);
  }
}

async function workflow() {

  // Revision input management
  const revision = document.getElementById('revision');
  revision.onkeydown = async function(evt){
    if(evt.keyCode === 13) {
      updateHash(revision.value);
    }
  };

  // Default generation with latest data
  await generate();
};

main(workflow, []);
