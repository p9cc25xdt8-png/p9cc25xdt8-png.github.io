const quizDiv = document.getElementById("quiz");
let currentIndex = 0;
let currentCategory = '監査論';
let currentSubcategory = null; // サブカテゴリフィルタ用
let answers = new Array(questions.length).fill(null); // store user's selected index per question
let currentQuestionList = null; // sampled list of questions for current quiz (random 10)
let reviewList = null; // array of question indexes (filtered indices within currentCategory) to review

function getFiltered() {
  // if we have a sampled list for the active quiz, use it
  if (Array.isArray(currentQuestionList) && currentQuestionList.length > 0) return currentQuestionList;
  
  // サブカテゴリでフィルタリング
  if (currentSubcategory) {
    return questions.filter(q => q.subcategory === currentSubcategory);
  }
  
  return questions.filter(q => q.category === currentCategory);
} 

function renderQuestion(index) {
  quizDiv.innerHTML = "";
  const filtered = getFiltered();
  if (filtered.length === 0) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<p>このカテゴリの問題はまだありません。</p>`;
    quizDiv.appendChild(card);
    return;
  }

  const q = filtered[index];
  const absoluteIndex = questions.findIndex(x => x.id === q.id);

  const card = document.createElement('div');
  card.className = 'card';

  const backBtn = document.createElement('button');
  backBtn.className = 'back-to-topics';
  backBtn.textContent = '← 英語クイズ - トップに戻る';
  backBtn.onclick = () => showHome();
  card.appendChild(backBtn);

  const title = document.createElement('h2');
  const categoryLabel = currentSubcategory ? currentSubcategory : currentCategory;
  title.textContent = `問題（${categoryLabel}） ${index + 1}`;
  card.appendChild(title);

  const p = document.createElement('p');
  // If this is a simple 'Which English term corresponds...' style question, render a contextual sentence instead
  let displayQuestion = q.question;
  let displayTranslation = q.translation;
  if (/Which English term corresponds to the Japanese account/i.test(q.question) || /英語でどれか。/.test(q.translation)) {
    const jap = q.meanings && q.meanings[0] ? q.meanings[0] : q.translation.replace(/は英語でどれか。/, '');
    displayQuestion = `The company reported (　) on the balance sheet.`;
    displayTranslation = `${jap}は貸借対照表で報告される。`;
  }
  p.innerHTML = `<strong>${displayQuestion}</strong>`;
  card.appendChild(p);

  const options = document.createElement('div');
  options.className = 'options';
  q.choices.forEach((choice, i) => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="radio" name="answer" value="${i}"> ${choice}`;
    // accessibility: make label focusable and keyboard-activatable
    label.tabIndex = 0;
    label.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const input = label.querySelector('input');
        if (input) {
          input.checked = true;
          input.focus();
        }
      }
    });
    options.appendChild(label);
  });
  // role for the group and keyboard navigation (arrow keys)
  options.setAttribute('role','radiogroup');
  options.addEventListener('keydown', (e) => {
    const keys = ['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const inputs = Array.from(options.querySelectorAll('input[name="answer"]'));
    if (inputs.length === 0) return;
    const focused = document.activeElement;
    let idx = inputs.findIndex(i => i === focused || i === focused.closest('label')?.querySelector('input'));
    if (idx === -1) idx = inputs.findIndex(i => i.checked) || 0;
    const dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
    let next = (idx + dir + inputs.length) % inputs.length;
    inputs[next].checked = true;
    inputs[next].focus();
  });
  card.appendChild(options);

  const actions = document.createElement('div');
  actions.style.marginTop = '12px';

  const checkBtn = document.createElement('button');
  checkBtn.textContent = '答え合わせ';
  checkBtn.onclick = () => checkAnswer(index);
  actions.appendChild(checkBtn);

  card.appendChild(actions);

  const result = document.createElement('p');
  result.id = 'result';
  result.setAttribute('aria-live','polite');
  result.tabIndex = -1; // make focusable for screen readers to jump
  result.style.marginTop = '12px';
  result.style.fontWeight = 'bold';
  card.appendChild(result);

  const progress = document.createElement('p');
  progress.className = 'progress';
  progress.textContent = `${index + 1} / ${filtered.length}`;
  card.appendChild(progress);

  quizDiv.appendChild(card);

  // set progress bar
  const fill = document.querySelector('.progress-fill');
  if (fill) {
    const pct = Math.round((index) / filtered.length * 100);
    fill.style.width = pct + '%';
    fill.setAttribute('aria-valuenow', pct);
  }

  // focus the first input for accessibility
  const firstInput = card.querySelector('input[name="answer"]');
  if (firstInput) firstInput.focus();
} 

function checkAnswer(index) {
  const filtered = getFiltered();
  const q = filtered[index];
  const absoluteIndex = questions.findIndex(x => x.id === q.id);

  const selected = document.querySelector('input[name="answer"]:checked');
  const result = document.getElementById('result');

  if (!selected) {
    result.textContent = '選択肢を選んでください。';
    result.style.color = 'var(--accent)';
    return;
  }

  const choiceIndex = Number(selected.value);

  // record answer using absolute index
  answers[absoluteIndex] = choiceIndex;

  // disable inputs
  document.querySelectorAll('input[name="answer"]').forEach(i => i.disabled = true);

  // highlight correct/incorrect
  const inputs = document.querySelectorAll('input[name="answer"]');
  inputs.forEach((input, idx) => {
    const lab = input.closest('label') || input.parentElement;
    if (!lab) return;
    lab.classList.remove('correct','incorrect');
    if (idx === q.answer) {
      lab.classList.add('correct');
    }
    if (input.checked && idx !== q.answer) {
      lab.classList.add('incorrect');
    }
  });

  if (choiceIndex === q.answer) {
    result.textContent = '正解！';
    result.style.color = 'var(--success)';
  } else {
    result.textContent = `不正解。正解は「${q.choices[q.answer]}」です。`;
    result.style.color = 'var(--error)';
  }

  // show translation and meaning
  const explanation = document.createElement('div');
  explanation.className = 'explanation';
  
  // Use the contextual translation if we transformed the question
  const shownTranslation = (/Which English term corresponds to the Japanese account/i.test(q.question) || /英語でどれか。/.test(q.translation)) ? (q.meanings && q.meanings[0] ? `${q.meanings[0]}は貸借対照表で報告される。` : q.translation) : q.translation;
  
  // 全ての選択肢の意味を表示
  let choicesHTML = '<p style="margin-top:16px;margin-bottom:8px"><strong>各選択肢の意味：</strong></p><ul style="margin:8px 0;padding-left:20px">';
  q.choices.forEach((choice, idx) => {
    const meaning = q.meanings[idx] ?? '—';
    const isCorrect = idx === q.answer;
    const isSelected = idx === choiceIndex;
    let badge = '';
    if (isCorrect) badge = '<span style="color:var(--success);font-weight:600"> ✓ 正解</span>';
    if (isSelected && !isCorrect) badge = '<span style="color:var(--error);font-weight:600"> ✗ あなたの選択</span>';
    choicesHTML += `<li style="margin-bottom:6px"><strong>${choice}</strong> — ${meaning}${badge}</li>`;
  });
  choicesHTML += '</ul>';
  
  explanation.innerHTML = `
    <p><strong>日本語訳：</strong> ${shownTranslation}</p>
    ${choicesHTML}
  `;
  explanation.style.marginTop = '8px';
  explanation.style.fontSize = '14px';
  explanation.style.color = 'var(--muted)';
  result.appendChild(explanation);
  // move focus to result so screen readers announce change
  result.focus();

  // show next button (handles reviewList navigation)
  const nextBtn = document.createElement('button');
  nextBtn.style.marginLeft = '8px';

  // helper to compute next index depending on reviewList
  function getNextIndexInContext(curr) {
    if (Array.isArray(reviewList) && reviewList.length > 0) {
      const pos = reviewList.indexOf(curr);
      if (pos >= 0 && pos + 1 < reviewList.length) return reviewList[pos + 1];
      return null; // finished review list
    }
    return curr + 1 < filtered.length ? curr + 1 : null;
  }

  const nextIndex = getNextIndexInContext(index);
  if (nextIndex !== null) {
    nextBtn.textContent = '次の問題へ';
    nextBtn.onclick = () => {
      // animate progress to next
      const fill = document.querySelector('.progress-fill');
      if (fill) {
        const pct = Math.round((nextIndex) / filtered.length * 100);
        fill.style.width = pct + '%';
        fill.setAttribute('aria-valuenow', pct);
      }
      currentIndex = nextIndex;
      setTimeout(() => renderQuestion(currentIndex), 220);
    };
  } else {
    // no next (either end of quiz or end of review)
    if (Array.isArray(reviewList) && reviewList.length > 0) {
      nextBtn.textContent = '復習を終了する';
      nextBtn.onclick = () => { reviewList = null; showResults(); };
    } else {
      nextBtn.textContent = '結果を見る';
      nextBtn.onclick = () => {
        const fill = document.querySelector('.progress-fill');
        if (fill) {
          fill.style.width = '100%';
          fill.setAttribute('aria-valuenow', 100);
        }
        showResults();
      };
    }
  }

  result.appendChild(nextBtn);
}

function showResults() {
  quizDiv.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';

  const h2 = document.createElement('h2');
  h2.textContent = '結果';
  card.appendChild(h2);

  // compute score within current category
  const filtered = getFiltered();
  const total = filtered.length;
  const scoreInCategory = filtered.reduce((acc, q) => {
    const ai = answers[questions.findIndex(x => x.id === q.id)];
    return acc + (ai === q.answer ? 1 : 0);
  }, 0);

  const p = document.createElement('p');
  p.innerHTML = `あなたのスコア: <strong>${scoreInCategory}</strong> / ${total}`;
  card.appendChild(p);

  // Table-style per-question results for current category
  const table = document.createElement('table');
  table.className = 'result-table';
  table.innerHTML = `
    <thead>
      <tr><th>問題</th><th>正誤</th><th>確認する</th></tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  const wrong = [];
  filtered.forEach((q, i) => {
    const abs = questions.findIndex(x => x.id === q.id);
    const tr = document.createElement('tr');
    const isCorrect = answers[abs] === q.answer;

    const tdNum = document.createElement('td');
    tdNum.textContent = i + 1;
    tr.appendChild(tdNum);

    const tdStatus = document.createElement('td');
    tdStatus.textContent = answers[abs] === null ? '未回答' : (isCorrect ? '正解' : '不正解');
    tdStatus.className = isCorrect ? 'ok' : 'ng';
    tr.appendChild(tdStatus);

    const tdAction = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = '確認する';
    btn.onclick = () => {
      // reset this question's answer so user can re-attempt
      answers[abs] = null;
      reviewList = [i]; // store index within filtered
      renderQuestion(i);
    };
    tdAction.appendChild(btn);
    tr.appendChild(tdAction);

    if (!isCorrect) wrong.push(i); // push filtered index
    tbody.appendChild(tr);
  });

  card.appendChild(table);

  const restart = document.createElement('button');
  restart.textContent = '最初からやり直す';
  restart.onclick = () => { filtered.forEach(q => { const abs = questions.findIndex(x => x.id === q.id); answers[abs] = null }); reviewList = null; currentIndex = 0; renderQuestion(0); };
  card.appendChild(restart);

  quizDiv.appendChild(card);
}

// set up subject tabs and home flow
const tabs = document.querySelector('.subject-tabs');
const home = document.getElementById('quiz-home');
const progressBar = document.querySelector('.progress-bar');
const quizArea = document.getElementById('quiz');

function showHome(){
  // clear any sampled quiz list when returning to home
  currentQuestionList = null;
  if (home) home.classList.remove('hidden');
  if (tabs) tabs.classList.add('hidden');
  if (progressBar) progressBar.classList.add('hidden');
  if (quizArea) quizArea.classList.add('hidden');
} 

function startCategory(subject){
  currentCategory = subject;
  currentSubcategory = null; // サブカテゴリをクリア
  currentIndex = 0;

  // sample up to 10 random questions from the category and store in currentQuestionList
  const pool = questions.filter(q => q.category === subject);
  if (pool.length > 10) {
    // Fisher-Yates shuffle for better randomness
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    currentQuestionList = arr.slice(0, 10);
  } else {
    currentQuestionList = pool.slice();
  }

  // update counts and selected tab
  updateCounts();
  if(tabs){
    tabs.querySelectorAll('button').forEach(b => { b.setAttribute('aria-selected','false'); b.tabIndex = -1 });
    const btn = tabs.querySelector(`button[data-subject="${subject}"]`);
    if(btn){ btn.setAttribute('aria-selected','true'); btn.tabIndex = 0; }
    tabs.classList.remove('hidden');
  }
  if(home) home.classList.add('hidden');
  if(progressBar) progressBar.classList.remove('hidden');
  if(quizArea) quizArea.classList.remove('hidden');
  // reset progress
  const fill = document.querySelector('.progress-fill');
  if (fill) { fill.style.width = '0%'; fill.setAttribute('aria-valuenow', 0); }
  renderQuestion(0);
}

// show counts on home cards
function updateCounts(){
  const counts = {};
  const subcounts = {};
  
  questions.forEach(q => {
    counts[q.category] = (counts[q.category] || 0) + 1;
    if (q.subcategory) {
      subcounts[q.subcategory] = (subcounts[q.subcategory] || 0) + 1;
    }
  });
  
  // カテゴリ別のカウント更新
  document.querySelectorAll('.subject-card .count').forEach(el => {
    const s = el.dataset.subject;
    if (s) {
      el.textContent = (counts[s] || 0) + '問';
    }
    
    const sub = el.dataset.subcategory;
    if (sub) {
      el.textContent = (subcounts[sub] || 0) + '問';
    }
  });
}

// サブカテゴリでクイズを開始
function startSubcategory(subcategory) {
  currentSubcategory = subcategory;
  currentCategory = '勘定科目等';
  currentIndex = 0;
  answers = new Array(questions.length).fill(null);
  reviewList = null;
  
  // サブカテゴリの全問題を取得
  const filtered = questions.filter(q => q.subcategory === subcategory);
  
  // ランダムに10問選択（問題数が10問未満の場合は全問題）
  const sampleSize = Math.min(10, filtered.length);
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  currentQuestionList = shuffled.slice(0, sampleSize);
  
  const home = document.getElementById('quiz-home');
  const tabs = document.querySelector('.subject-tabs');
  const progressBar = document.querySelector('.progress-bar');
  const quizArea = document.getElementById('quiz');
  
  if (tabs) tabs.classList.add('hidden');
  if (home) home.classList.add('hidden');
  if (progressBar) progressBar.classList.remove('hidden');
  if (quizArea) quizArea.classList.remove('hidden');
  
  const fill = document.querySelector('.progress-fill');
  if (fill) { fill.style.width = '0%'; fill.setAttribute('aria-valuenow', 0); }
  
  renderQuestion(0);
}

// home subject card handlers
if (home) {
  home.querySelectorAll('.subject-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.subject) {
        startCategory(card.dataset.subject);
      } else if (card.dataset.subcategory) {
        startSubcategory(card.dataset.subcategory);
      }
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (card.dataset.subject) {
          startCategory(card.dataset.subject);
        } else if (card.dataset.subcategory) {
          startSubcategory(card.dataset.subcategory);
        }
      }
    });
  });
}

// tabs should switch category and start
if (tabs) {
  tabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const subject = btn.dataset.subject;
      if (subject === currentCategory) return;
      startCategory(subject);
    });
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const all = Array.from(tabs.querySelectorAll('button'));
        let idx = all.indexOf(document.activeElement);
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        let next = (idx + dir + all.length) % all.length;
        all[next].focus();
      }
    });
  });
}

// show home view on load
updateCounts();
showHome();
