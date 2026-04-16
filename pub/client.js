// ============================================================
// ÉTAT DE L'APPLICATION
// ============================================================
let offset    = 0;
let loading   = false;
let allLoaded = false;
const LIMIT   = 10;

function getSession() {
  return {
    sessionId: localStorage.getItem('sessionId'),
    username:  localStorage.getItem('username'),
  };
}

function isLoggedIn() {
  return !!getSession().sessionId;
}

// ============================================================
// CONSTRUCTION DE L'INTERFACE
// ============================================================
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(buildNav());
  app.appendChild(buildFeed());
}

function buildNav() {
  const nav     = document.createElement('nav');
  const title   = document.createElement('h1');
  title.textContent = 'Twitter Clone';
  nav.appendChild(title);

  const actions = document.createElement('div');
  actions.id = 'nav-actions';

  if (isLoggedIn()) {
    const { username } = getSession();

    const greeting = document.createElement('span');
    greeting.textContent = username;
    actions.appendChild(greeting);

    const postBtn = document.createElement('button');
    postBtn.textContent = 'Nouveau message';
    postBtn.onclick = showPostModal;
    actions.appendChild(postBtn);

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Déconnexion';
    logoutBtn.className = 'btn-outline';
    logoutBtn.onclick = logout;
    actions.appendChild(logoutBtn);
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Connexion';
    loginBtn.onclick = showLoginModal;
    actions.appendChild(loginBtn);

    const signinBtn = document.createElement('button');
    signinBtn.textContent = 'Créer un compte';
    signinBtn.className = 'btn-outline';
    signinBtn.onclick = showSigninModal;
    actions.appendChild(signinBtn);
  }

  nav.appendChild(actions);
  return nav;
}

function buildFeed() {
  const section = document.createElement('section');
  section.id = 'feed';
  return section;
}

// ============================================================
// CHARGEMENT DES MESSAGES
// ============================================================
async function loadMessages(reset = false) {
  if (loading || allLoaded) return;
  loading = true;

  if (reset) {
    offset    = 0;
    allLoaded = false;
    const feed = document.getElementById('feed');
    if (feed) feed.innerHTML = '';
  }

  try {
    const res  = await fetch(`/messages?limit=${LIMIT}&offset=${offset}`);
    const data = await res.json();
    const feed = document.getElementById('feed');

    if (data.length === 0) {
      allLoaded = true;
      if (offset === 0) {
        const empty = document.createElement('p');
        empty.className   = 'empty';
        empty.textContent = 'Aucun message pour l\'instant.';
        feed.appendChild(empty);
      }
    } else {
      data.forEach(msg => feed.appendChild(buildCard(msg)));
      offset += data.length;
    }
  } catch (e) {
    showError('Erreur lors du chargement des messages.');
  }

  loading = false;
}

function buildCard(msg) {
  const card   = document.createElement('article');
  const header = document.createElement('div');
  header.className = 'card-header';

  const author = document.createElement('strong');
  author.textContent = msg.author;

  const date = document.createElement('time');
  date.textContent = new Date(msg.date).toLocaleString('fr-FR');

  header.appendChild(author);
  header.appendChild(date);

  const content = document.createElement('p');
  content.textContent = msg.content;

  card.appendChild(header);
  card.appendChild(content);
  return card;
}

// ============================================================
// MODALES
// ============================================================
function showModal(titleText, fields, submitLabel, onSubmit) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const h2 = document.createElement('h2');
  h2.textContent = titleText;
  modal.appendChild(h2);

  const msg = document.createElement('p');
  msg.className = 'modal-msg';
  modal.appendChild(msg);

  const inputs = {};
  fields.forEach(({ name, placeholder, type }) => {
    const input = document.createElement('input');
    input.type         = type || 'text';
    input.placeholder  = placeholder;
    input.autocomplete = name;
    modal.appendChild(input);
    inputs[name] = input;
  });

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';

  const submitBtn = document.createElement('button');
  submitBtn.textContent = submitLabel;
  submitBtn.onclick = () => onSubmit(inputs, msg, overlay);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annuler';
  cancelBtn.className   = 'btn-outline';
  cancelBtn.onclick     = () => overlay.remove();

  btnRow.appendChild(submitBtn);
  btnRow.appendChild(cancelBtn);
  modal.appendChild(btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  Object.values(inputs)[0].focus();
}

function showSigninModal() {
  showModal(
    'Créer un compte',
    [
      { name: 'username', placeholder: 'Nom d\'utilisateur' },
      { name: 'password', placeholder: 'Mot de passe', type: 'password' },
    ],
    'Créer',
    async (inputs, msg, overlay) => {
      const username = inputs.username.value.trim();
      const password = inputs.password.value;
      if (!username || !password) {
        msg.textContent = 'Remplis tous les champs.';
        return;
      }
      try {
        const res  = await fetch('/signin', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.ok) {
          overlay.remove();
          showSuccess('Compte créé ! Tu peux maintenant te connecter.');
        } else {
          msg.textContent = data.error;
        }
      } catch (e) {
        msg.textContent = 'Erreur réseau.';
      }
    }
  );
}

function showLoginModal() {
  showModal(
    'Connexion',
    [
      { name: 'username', placeholder: 'Nom d\'utilisateur' },
      { name: 'password', placeholder: 'Mot de passe', type: 'password' },
    ],
    'Se connecter',
    async (inputs, msg, overlay) => {
      const username = inputs.username.value.trim();
      const password = inputs.password.value;
      if (!username || !password) {
        msg.textContent = 'Remplis tous les champs.';
        return;
      }
      try {
        const res  = await fetch('/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.ok) {
          localStorage.setItem('sessionId', data.sessionId);
          localStorage.setItem('username',  data.username);
          overlay.remove();
          offset    = 0;
          allLoaded = false;
          loading   = false;
          render();
          await loadMessages(true);
        } else {
          msg.textContent = data.error;
        }
      } catch (e) {
        msg.textContent = 'Erreur réseau.';
      }
    }
  );
}

function showPostModal() {
  showModal(
    'Nouveau message',
    [{ name: 'content', placeholder: 'Quoi de neuf ?' }],
    'Publier',
    async (inputs, msg, overlay) => {
      const content = inputs.content.value.trim();
      if (!content) { msg.textContent = 'Le message est vide.'; return; }
      const { sessionId } = getSession();
      try {
        const res  = await fetch('/post', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ sessionId, content }),
        });
        const data = await res.json();
        if (data.ok) {
          overlay.remove();
          offset    = 0;
          allLoaded = false;
          loading   = false;
          await loadMessages(true);
        } else {
          msg.textContent = data.error;
        }
      } catch (e) {
        msg.textContent = 'Erreur réseau.';
      }
    }
  );
}

// ============================================================
// DÉCONNEXION
// ============================================================
function logout() {
  localStorage.removeItem('sessionId');
  localStorage.removeItem('username');
  offset    = 0;
  allLoaded = false;
  loading   = false;
  render();
  loadMessages(true);
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function showSuccess(text) { showToast(text, 'toast-success'); }
function showError(text)   { showToast(text, 'toast-error');   }

function showToast(text, className) {
  const toast = document.createElement('div');
  toast.className   = `toast ${className}`;
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// MODULES OPTIONNELS
// ============================================================

// Scroll infini
window.addEventListener('scroll', () => {
  const nearBottom =
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
  if (nearBottom) loadMessages();
});

// Rafraîchissement automatique toutes les 5 secondes
setInterval(() => {
  if (!loading) loadMessages(true);
}, 5000);

// ============================================================
// DÉMARRAGE
// ============================================================
render();
loadMessages();