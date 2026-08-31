'use client';

import { useEffect, useState } from 'react';

const API =
  'https://nhielwcjvbmtwnsrmeog.supabase.co/functions/v1/office-api';

const ALLOWED = [
  'dariabarbarabartos@gmail.com',
  'biurodariabarbara@gmail.com',
];

export default function Page() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [me, setMe] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [error, setError] = useState('');

  async function api(action, extra = {}, auth = me) {
    const credentials = auth || {
      email: email.toLowerCase().trim(),
      code,
    };

    const response = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        email: credentials.email,
        code: credentials.code,
        ...extra,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.error === 'string'
          ? data.error
          : 'Wystąpił błąd'
      );
    }

    return data;
  }

  async function loadTasks(auth = me) {
    try {
      const data = await api('list', {}, auth);
      setTasks(data.tasks || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('office_auth')
      );

      if (saved?.email && saved?.code) {
        setMe(saved);
        loadTasks(saved);
      }
    } catch {}
  }, []);

  async function login() {
    setError('');

    const normalizedEmail = email.toLowerCase().trim();

    if (!ALLOWED.includes(normalizedEmail)) {
      setError('Ten adres e-mail nie ma dostępu.');
      return;
    }

    const auth = {
      email: normalizedEmail,
      code,
    };

    try {
      const data = await api('list', {}, auth);

      localStorage.setItem(
        'office_auth',
        JSON.stringify(auth)
      );

      setMe(auth);
      setTasks(data.tasks || []);
    } catch (e) {
      setError(e.message);
    }
  }

  async function addTask() {
    if (!title.trim()) {
      setError('Wpisz tytuł zadania.');
      return;
    }

    try {
      await api('create', {
        title: title.trim(),
        description: description.trim(),
      });

      setTitle('');
      setDescription('');
      setShowForm(false);
      setError('');

      await loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }

  async function changeStatus(id, status) {
    let note = null;

    if (status === 'done') {
      note = window.prompt(
        'Uwagi po wykonaniu zadania — opcjonalnie:',
        ''
      );

      if (note === null) return;
    }

    try {
      await api('status', {
        id,
        status,
        note,
      });

      await loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }

  function logout() {
    localStorage.removeItem('office_auth');
    setMe(null);
    setTasks([]);
    setEmail('');
    setCode('');
  }

  if (!me) {
    return (
      <main className="w">
        <div className="card login">
          <div className="ey">DARIA BARBARA</div>

          <h1>Zadania biura</h1>

          <p className="mut">
            Zaloguj się adresem e-mail i kodem dostępu.
          </p>

          <input
            type="email"
            placeholder="adres e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            inputMode="numeric"
            placeholder="kod dostępu"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <button
            style={{
              width: '100%',
              marginTop: 8,
            }}
            onClick={login}
          >
            Zaloguj
          </button>

          {error && (
            <div className="err">
              {error}
            </div>
          )}
        </div>
      </main>
    );
  }

  const tabs = [
    ['all', 'Wszystkie'],
    ['todo', 'Do zrobienia'],
    ['in_progress', 'W trakcie'],
    ['done', 'Zrobione'],
  ];

  const filteredTasks =
    filter === 'all'
      ? tasks
      : tasks.filter(
          (task) => task.status === filter
        );

  return (
    <main className="w">
      <div className="top">
        <div>
          <div className="ey">
            DARIA BARBARA
          </div>

          <h1>Zadania biura</h1>

          <div className="mut">
            {me.email ===
            'dariabarbarabartos@gmail.com'
              ? 'Daria · Szefowa'
              : 'Biuro'}
          </div>
        </div>

        <div className="row">
          <button
            className="lite"
            onClick={() =>
              setShowForm(!showForm)
            }
          >
            + Nowe zadanie
          </button>

          <button
            className="lite"
            onClick={logout}
          >
            Wyloguj
          </button>
        </div>
      </div>

      {error && (
        <div className="err">
          {error}
        </div>
      )}

      {showForm && (
        <div className="form">
          <input
            placeholder="Tytuł zadania"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
          />

          <textarea
            placeholder="Opis / szczegóły"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          <button onClick={addTask}>
            Dodaj zadanie
          </button>
        </div>
      )}

      <div className="tabs">
        {tabs.map(([key, label]) => {
          const count =
            key === 'all'
              ? tasks.length
              : tasks.filter(
                  (task) =>
                    task.status === key
                ).length;

          return (
            <button
              key={key}
              className={
                filter === key ? 'on' : ''
              }
              onClick={() =>
                setFilter(key)
              }
            >
              {label} {count}
            </button>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div
          className="mut"
          style={{
            textAlign: 'center',
            padding: 40,
          }}
        >
          Brak zadań w tej sekcji.
        </div>
      )}

      {filteredTasks.map((task) => (
        <div
          className="card"
          key={task.id}
        >
          <div className="bot">
            <span
              className={
                'st ' +
                (task.status === 'done'
                  ? 'done'
                  : task.status ===
                    'in_progress'
                  ? 'prog'
                  : '')
              }
            >
              {task.status === 'todo'
                ? 'Do zrobienia'
                : task.status ===
                  'in_progress'
                ? 'W trakcie'
                : 'Zrobione'}
            </span>

            <span className="mut">
              {new Date(
                task.created_at
              ).toLocaleString('pl-PL')}
            </span>
          </div>

          <h2>{task.title}</h2>

          {task.description && (
            <p>{task.description}</p>
          )}

          {task.completion_note && (
            <div className="note">
              <b>Uwagi:</b>{' '}
              {task.completion_note}
            </div>
          )}

          <div className="bot">
            <span className="mut">
              {task.assigned_to_email ||
                'Biuro'}
            </span>

            <div className="row">
              {task.status === 'todo' && (
                <button
                  onClick={() =>
                    changeStatus(
                      task.id,
                      'in_progress'
                    )
                  }
                >
                  Rozpocznij
                </button>
              )}

              {task.status !== 'done' ? (
                <button
                  onClick={() =>
                    changeStatus(
                      task.id,
                      'done'
                    )
                  }
                >
                  ✓ Zrobione
                </button>
              ) : (
                <button
                  className="lite"
                  onClick={() =>
                    changeStatus(
                      task.id,
                      'todo'
                    )
                  }
                >
                  Przywróć
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}
