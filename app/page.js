'use client';

import { useEffect, useState } from 'react';

const API =
  'https://nhielwcjvbmtwnsrmeog.supabase.co/functions/v1/office-api';

const BOSS = 'dariabarbarabartos@gmail.com';
const OFFICE = 'biurodariabarbara@gmail.com';

const MAX_FILES = 3;
const MAX_FILE_MB = 5;

function personLabel(email) {
  if (email === BOSS) return 'Szefowa';
  if (email === OFFICE) return 'Biuro';
  return email || 'Biuro';
}

export default function Page() {
  const [code, setCode] = useState('');
  const [me, setMe] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [assignee, setAssignee] = useState(OFFICE);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function api(action, extra = {}, auth = me) {
    const credentials = auth || { code };

    const response = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
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

      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('office_auth')
      );

      if (saved?.code) {
        loadTasks(saved)
          .then((data) => {
            const loggedUser = {
              code: saved.code,
              email: data.me?.email,
            };

            setMe(loggedUser);

            setAssignee(
              data.me?.email === OFFICE
                ? OFFICE
                : OFFICE
            );

            localStorage.setItem(
              'office_auth',
              JSON.stringify(loggedUser)
            );
          })
          .catch(() => {
            localStorage.removeItem('office_auth');
          });
      }
    } catch {}
  }, []);

  async function login() {
    setError('');
    setMessage('');

    if (!code.trim()) {
      setError('Wpisz kod dostępu.');
      return;
    }

    const auth = {
      code: code.trim(),
    };

    try {
      const data = await api('list', {}, auth);

      const loggedUser = {
        code: auth.code,
        email: data.me?.email,
      };

      localStorage.setItem(
        'office_auth',
        JSON.stringify(loggedUser)
      );

      setMe(loggedUser);
      setTasks(data.tasks || []);

      setAssignee(
        data.me?.email === OFFICE
          ? OFFICE
          : OFFICE
      );

      setCode('');
    } catch (e) {
      setError(e.message);
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  function chooseFiles(e) {
    setError('');

    const allFiles = Array.from(e.target.files || []);

    if (allFiles.length > MAX_FILES) {
      setError(
        `Możesz dodać maksymalnie ${MAX_FILES} zdjęcia.`
      );
      e.target.value = '';
      return;
    }

    const tooBig = allFiles.find(
      (file) =>
        file.size >
        MAX_FILE_MB * 1024 * 1024
    );

    if (tooBig) {
      setError(
        `Każde zdjęcie może mieć maksymalnie ${MAX_FILE_MB} MB.`
      );
      e.target.value = '';
      return;
    }

    setFiles(allFiles);
  }

  function removeFile(index) {
    setFiles((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function addTask() {
    if (!title.trim()) {
      setError('Wpisz tytuł zadania.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const preparedFiles = [];

      for (const file of files) {
        const data = await fileToDataUrl(file);

        preparedFiles.push({
          name: file.name,
          type: file.type || 'image/jpeg',
          data,
        });
      }

      const data = await api('create', {
        title: title.trim(),
        description: description.trim(),
        files: preparedFiles,
        assigned_to_email: assignee,
      });

      setTitle('');
      setDescription('');
      setFiles([]);
      setShowForm(false);

      if (data.email_skipped) {
        setMessage(
          'Zadanie dodane. Zadanie własne — bez powiadomienia e-mail.'
        );
      } else if (data.email_sent) {
        setMessage(
          `Zadanie dodane. Powiadomienie wysłane do: ${personLabel(
            assignee
          )}.`
        );
      } else {
        setMessage(
          'Zadanie dodane, ale powiadomienie e-mail nie zostało wysłane.'
        );
      }

      await loadTasks();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
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
      setError('');

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
    setCode('');
    setMessage('');
    setError('');
  }

  if (!me) {
    return (
      <main className="w">
        <div className="card login">
          <div className="ey">
            DARIA BARBARA
          </div>

          <h1>Zadania biura</h1>

          <p className="mut">
            Wpisz swój kod dostępu.
          </p>

          <input
            type="password"
            inputMode="numeric"
            placeholder="Kod dostępu"
            value={code}
            onChange={(e) =>
              setCode(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') login();
            }}
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
            Zalogowano: {personLabel(me.email)}
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

      {message && (
        <div className="note">
          {message}
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

          <div
            style={{
              margin: '10px 0 14px',
            }}
          >
            <div
              className="mut"
              style={{
                marginBottom: 6,
              }}
            >
              Dla kogo jest zadanie?
            </div>

            <select
              value={assignee}
              onChange={(e) =>
                setAssignee(e.target.value)
              }
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #ddd',
                background: '#fff',
                fontSize: 15,
              }}
            >
              <option value={OFFICE}>
                Biuro
              </option>

              <option value={BOSS}>
                Szefowa
              </option>
            </select>
          </div>

          <div
            style={{
              margin: '10px 0 14px',
            }}
          >
            <label
              className="lite"
              style={{
                display: 'inline-block',
                padding: '11px 16px',
                borderRadius: 999,
                cursor: 'pointer',
                fontWeight: 650,
              }}
            >
              📷 Dodaj zdjęcia

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={chooseFiles}
                style={{
                  display: 'none',
                }}
              />
            </label>

            <span
              className="mut"
              style={{
                marginLeft: 10,
              }}
            >
              max {MAX_FILES} zdjęcia,{' '}
              {MAX_FILE_MB} MB każde
            </span>
          </div>

          {files.length > 0 && (
            <div
              style={{
                marginBottom: 14,
              }}
            >
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="mut"
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <span>
                    • {file.name}
                  </span>

                  <button
                    type="button"
                    className="lite"
                    onClick={() =>
                      removeFile(index)
                    }
                    style={{
                      padding: '5px 10px',
                    }}
                  >
                    Usuń
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addTask}
            disabled={saving}
          >
            {saving
              ? 'Dodaję…'
              : 'Dodaj zadanie'}
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

          {Array.isArray(
            task.attachments
          ) &&
            task.attachments.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill,minmax(120px,1fr))',
                  gap: 10,
                  margin: '14px 0',
                }}
              >
                {task.attachments.map(
                  (attachment, i) =>
                    attachment.url ? (
                      <a
                        href={
                          attachment.url
                        }
                        target="_blank"
                        rel="noreferrer"
                        key={
                          attachment.path || i
                        }
                      >
                        <img
                          src={
                            attachment.url
                          }
                          alt={
                            attachment.name ||
                            'Załącznik'
                          }
                          style={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 12,
                            border:
                              '1px solid #e4ded5',
                          }}
                        />
                      </a>
                    ) : null
                )}
              </div>
            )}

          {task.completion_note && (
            <div className="note">
              <b>Uwagi:</b>{' '}
              {task.completion_note}
            </div>
          )}

          <div className="bot">
            <span className="mut">
              Dla:{' '}
              <b>
                {personLabel(
                  task.assigned_to_email
                )}
              </b>
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
