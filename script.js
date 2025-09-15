// script.js — Dynamic rendering for DT challenge
const REMOTE_JSON = 'https://dev.deepthought.education/assets/uploads/files/files/others/ddugky_project.json';

// FALLBACK sample data (used when remote fetch fails or for offline testing)
// I modeled this with typical fields: taskId, taskName, assets[]
const SAMPLE_PROJECT = {
  projectId: "ddugky-001",
  projectName: "Example DT Project (sample)",
  tasks: [
    {
      taskId: "t101",
      taskName: "Introduction & Reading",
      taskMeta: "Contains articles and podcasts",
      assets: [
        {
          assetId: "a1",
          title: "Intro Article: Understanding DTthon",
          type: "article",
          url: "https://deepthought.education/",
          description: "A short article about DeepThought's DTthon process and assessment philosophy."
        },
        {
          assetId: "a2",
          title: "Orientation Video",
          type: "video",
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          description: "Short video explaining how the selection process works."
        },
        {
          assetId: "a3",
          title: "Founder Podcast (audio)",
          type: "audio",
          url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          description: "Listen to the founder discuss the vision."
        }
      ]
    },
    {
      taskId: "t102",
      taskName: "Practical Task",
      taskMeta: "Hands-on assets (files, links)",
      assets: [
        {
          assetId: "b1",
          title: "Assignment PDF",
          type: "file",
          url: "https://example.com/sample.pdf",
          description: "Downloadable assignment spec for the practical task."
        },
        {
          assetId: "b2",
          title: "Reference Video",
          type: "video",
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          description: "Reference demonstration."
        }
      ]
    }
  ]
};

// --- DOM references ---
const taskListEl = document.getElementById('taskList');
const assetsContainer = document.getElementById('assetsContainer');
const taskTitle = document.getElementById('taskTitle');
const taskMeta = document.getElementById('taskMeta');
const boardToggleBtn = document.getElementById('board-toggle');
const journeyBoard = document.getElementById('journeyBoard');

let PROJECT_DATA = null;
let currentTaskIndex = 0;

// Utility: safe pick for variable key variations
function pick(...vals){
  for(const v of vals) if(typeof v !== 'undefined') return v;
  return undefined;
}

// Create a task-list item DOM node
function createTaskListItem(task, index){
  const li = document.createElement('li');
  li.className = 'task-item';
  li.setAttribute('role','listitem');
  li.tabIndex = 0;
  li.dataset.index = index;

  // icon / small circle with first letter
  const icon = document.createElement('div');
  icon.className = 'ticon';
  icon.textContent = (task.taskName || task.taskName || 'Task')[0] || 'T';

  const txt = document.createElement('div');
  txt.className = 'ttext';
  txt.textContent = task.taskName || task.name || `Task ${index+1}`;

  li.appendChild(icon);
  li.appendChild(txt);

  li.addEventListener('click', () => {
    selectTask(index);
  });
  li.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTask(index); }
  });
  return li;
}

// Create a single asset card (reusable component)
function createAssetCard(asset){
  // support multiple possible field names
  const id = pick(asset.assetId, asset.id, asset.assetID) || 'asset-' + Math.random().toString(36).slice(2,8);
  const title = pick(asset.title, asset.name, asset.assetName) || 'Untitled asset';
  const type = (pick(asset.type, asset.assetType, asset.format) || 'article').toLowerCase();
  const description = pick(asset.description, asset.desc, asset.summary) || '';
  const url = pick(asset.url, asset.link, asset.drive_link) || '';
  const subtype = pick(asset.subtype, asset.mime) || '';

  const card = document.createElement('article');
  card.className = 'asset-card';
  card.id = id;

  // top row
  const top = document.createElement('div');
  top.className = 'asset-top';

  const left = document.createElement('div');
  left.className = 'asset-left';

  const icon = document.createElement('div');
  icon.className = 'asset-icon';
  // simple icon text by type
  icon.textContent = (type === 'video' ? '▶' : type === 'audio' ? '♪' : type === 'file' ? '📄' : 'A');

  const meta = document.createElement('div');
  meta.className = 'asset-meta';

  const h3 = document.createElement('h3');
  h3.className = 'asset-title';
  h3.textContent = title;

  const sub = document.createElement('div');
  sub.className = 'asset-sub';
  sub.textContent = `${type.toUpperCase()} ${url ? '· resource available' : ''}`;

  meta.appendChild(h3);
  meta.appendChild(sub);

  left.appendChild(icon);
  left.appendChild(meta);

  // arrow toggle
  const btn = document.createElement('button');
  btn.className = 'toggle-arrow';
  btn.setAttribute('aria-expanded','false');
  btn.title = 'Show description';
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '➤';
  btn.appendChild(arrow);

  // append
  top.appendChild(left);
  top.appendChild(btn);
  card.appendChild(top);

  // description section (initially hidden)
  const desc = document.createElement('div');
  desc.className = 'asset-desc';
  const p = document.createElement('p');
  p.style.margin = 0;
  p.textContent = description;
  desc.appendChild(p);

  // if there's a url and type is video/audio/file/article, attach inline control where appropriate
  if(url){
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'media-wrapper';

    if(type === 'video' && /\.(mp4|webm|ogg)$/i.test(url)){
      const vid = document.createElement('video');
      vid.controls = true;
      vid.src = url;
      mediaWrap.appendChild(vid);
    } else if(type === 'audio' && /\.(mp3|wav|ogg)$/i.test(url)){
      const aud = document.createElement('audio');
      aud.controls = true;
      aud.src = url;
      mediaWrap.appendChild(aud);
    } else if(type === 'video' && /(youtube\.com|youtu\.be|drive.google.com)/i.test(url)){
      // try iframe for youtube/drive (best-effort)
      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height = '320';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.src = convertToEmbed(url);
      iframe.setAttribute('referrerpolicy','no-referrer');
      mediaWrap.appendChild(iframe);
    } else {
      // generic link
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Open resource';
      mediaWrap.appendChild(a);
    }

    desc.appendChild(mediaWrap);
  }

  card.appendChild(desc);

  // toggle behavior
  btn.addEventListener('click', () => {
    const isOpen = desc.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    arrow.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
  });

  return card;
}

// Convert common links into embed-friendly URLs (simple heuristics)
function convertToEmbed(url){
  if(/youtube\.com\/watch\?v=([^&]+)/i.test(url)){
    const id = url.match(/v=([^&]+)/i)[1];
    return `https://www.youtube.com/embed/${id}`;
  }
  if(/youtu\.be\/([^?&]+)/i.test(url)){
    const id = url.match(/youtu\.be\/([^?&]+)/i)[1];
    return `https://www.youtube.com/embed/${id}`;
  }
  if(/drive.google.com\/file\/d\/([^\/]+)/i.test(url)){
    const id = url.match(/file\/d\/([^\/]+)/i)[1];
    return `https://drive.google.com/file/d/${id}/preview`;
  }
  // fallback to direct
  return url;
}

// Render the sidebar tasks
function renderTaskList(tasks){
  taskListEl.innerHTML = '';
  tasks.forEach((t, i) => {
    const item = createTaskListItem(t, i);
    taskListEl.appendChild(item);
  });
  highlightActiveTask();
}

// Select a task by index
function selectTask(index){
  currentTaskIndex = index;
  highlightActiveTask();
  const tasks = PROJECT_DATA.tasks || [];
  const t = tasks[index];
  renderTaskHeader(t);
  renderAssetsForTask(t);
}

// add visual active class in list
function highlightActiveTask(){
  const items = taskListEl.querySelectorAll('.task-item');
  items.forEach(li => {
    li.classList.toggle('active', Number(li.dataset.index) === currentTaskIndex);
  });
}

// Render header info for task
function renderTaskHeader(task){
  taskTitle.textContent = task.taskName || task.name || 'Untitled Task';
  taskMeta.textContent = task.taskMeta || task.meta || '';
}

// Clear and append assets for a task
function renderAssetsForTask(task){
  assetsContainer.innerHTML = '';
  const assets = task.assets || [];
  if(assets.length === 0){
    const msg = document.createElement('div');
    msg.className = 'asset-card';
    msg.textContent = 'No assets found for this task.';
    assetsContainer.appendChild(msg);
    return;
  }
  assets.forEach(asset => {
    const node = createAssetCard(asset);
    assetsContainer.appendChild(node);
  });
}

// toggle board collapsed/expanded
boardToggleBtn.addEventListener('click', () => {
  const collapsed = journeyBoard.classList.toggle('collapsed');
  boardToggleBtn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
  // when collapsed, hide labels — we keep it simple: CSS reduces width
});

// Main: attempt to fetch remote JSON; on fail, fallback to sample
async function init(){
  try {
    const resp = await fetch(REMOTE_JSON, {cache: "no-store"});
    if(!resp.ok) throw new Error('Remote fetch failed');
    const data = await resp.json();
    // Data shape may be project with tasks[] or single task. Normalize:
    PROJECT_DATA = normalizeProjectData(data);
  } catch (err) {
    console.warn('Could not fetch remote JSON, using sample data. Error:', err);
    PROJECT_DATA = SAMPLE_PROJECT;
  }

  // populate UI
  const tasks = PROJECT_DATA.tasks || [];
  if(tasks.length === 0){
    // maybe remote JSON corresponds to a single task object (assignment suggests "this page corresponds to one particular task")
    // if so, attempt fallback
    const singleTask = PROJECT_DATA.task || PROJECT_DATA;
    PROJECT_DATA = { projectId: PROJECT_DATA.projectId || 'p-sample', projectName: PROJECT_DATA.projectName || 'Sample', tasks: [singleTask] };
  }

  renderTaskList(PROJECT_DATA.tasks);
  selectTask(currentTaskIndex);
}

// Normalize shapes we may encounter
function normalizeProjectData(raw){
  // If the JSON has "project" wrapper or direct tasks
  if(raw.tasks && Array.isArray(raw.tasks)) return raw;
  // If it's a single task with assets
  if(raw.assets && Array.isArray(raw.assets)){
    return { projectId: raw.projectId || 'p-', projectName: raw.projectName || 'project', tasks: [raw] };
  }
  // If it's object with project->tasks nested differently, try to find tasks
  if(raw.project && raw.project.tasks) return raw.project;
  // fallback: return as-is wrapped
  return raw;
}

// initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
