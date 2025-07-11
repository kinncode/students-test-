let currentUser = null;
let currentProfile = null;
// 登入狀態監聽
firebase.auth().onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  currentProfile = await window.FirebaseService.getCurrentUserProfile(user.uid);
  document.getElementById('profile-name').textContent = currentProfile?.name || user.email || '未知';
  document.getElementById('profile-role').textContent = currentProfile?.role === 'admin' ? '（管理者）' : (currentProfile?.role === 'teacher' ? '（老師）' : '（學生）');
  if (currentProfile?.role === 'admin') {
    showAdminSection();
  } else {
    document.getElementById('admin-section').style.display = 'none';
  }
  renderMyWorks();
});
// 登出
document.addEventListener('DOMContentLoaded', function() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.onclick = () => firebase.auth().signOut();
  const uploadBtn = document.getElementById('upload-work-btn');
  if (uploadBtn) uploadBtn.onclick = () => showUploadWorkModal();
  const editBtn = document.getElementById('edit-profile-btn');
  if (editBtn) editBtn.onclick = showEditProfileModal;
});
// 渲染個人作品優化/清理 profile.html，
async function renderMyWorks() {
  const works = await window.FirebaseService.getWorks();
  const comments = await window.FirebaseService.getComments();
  const users = await window.FirebaseService.getUsers();
  const groups = await window.FirebaseService.getGroups();
  const classes = await window.FirebaseService.getClasses();
  const myWorks = Object.values(works || {}).filter(w => w.studentId === currentUser.uid);
  const list = document.getElementById('my-works-list');
  list.innerHTML = '';
  if (myWorks.length === 0) {
    list.innerHTML = '<div class="empty-tip">您尚未上傳任何作品，請點擊下方按鈕新增。</div>';
    return;
  }
  myWorks.forEach(work => {
    const card = document.createElement('div');
    card.className = 'work-card';
    card.innerHTML = `
      <div class="work-title">${work.title || '未命名作品'}</div>
      <div class="work-meta">上傳：${(work.createdAt||'').split('T')[0]}</div>
      <div class="video-container" style="width:100%;max-width:420px;margin:0 auto;">
        <div style="position:relative;width:100%;padding-bottom:56.25%;background:#000;border-radius:8px;overflow:hidden;">
          <iframe src="${work.videoUrl}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;"></iframe>
        </div>
      </div>
      <div class="work-actions">
        <button class="auth-btn" onclick="editWork('${work.id}')">編輯</button>
        <button class="auth-btn" style="background:#e88;" onclick="deleteWork('${work.id}')">刪除</button>
      </div>
    `;
    // ====== 加入留言串 ======
    const workComments = Object.values(comments || {}).filter(c => c.workId === work.id);
    if (workComments.length > 0) {
      const commentsDiv = document.createElement('div');
      commentsDiv.className = 'work-comments';
      commentsDiv.innerHTML = `<div>留言 (${workComments.length})</div>`;
      workComments.forEach(comment => {
        const user = users[comment.reviewerId] || {};
        const groupName = groups && user.groupId ? (groups[user.groupId]?.name || user.groupId) : '';
        const className = classes && user.classId ? (classes[user.classId]?.name || user.classId) : '';
        const meta = [className, user.studentId, groupName].filter(Boolean).join('｜');
        const stars = '★'.repeat(comment.rating || 0) + '☆'.repeat(5-(comment.rating || 0));
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-block';
        commentDiv.innerHTML = `
          <div class="comment-meta">
            ${comment.reviewerName || '匿名'}
            <span class="meta-info">${meta}</span>
            <span class="stars">${stars}</span>
          </div>
          <div class="comment-content">${comment.content || ''}</div>
        `;
        commentsDiv.appendChild(commentDiv);
      });
      card.appendChild(commentsDiv);
    }
    list.appendChild(card);
  });
}
// 上傳作品 Modal
function showUploadWorkModal() {
  const modal = document.getElementById('upload-work-modal');
  modal.style.display = '';
  modal.innerHTML = `
    <div class="modal-bg" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:10000;"></div>
    <div class="modal-content" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background: #ceaaaa;padding:32px 24px;border-radius:12px;z-index:10001;max-width:350px;width:90vw;">
      <h2 style="margin-bottom:16px;">上傳新作品</h2>
      <form id="work-upload-form">
        <div class="form-group">
          <label>作品標題</label>
          <input type="text" id="work-title" required style="width:100%;margin-bottom:10px;">
          <div style="color:#888;font-size:0.95em;margin-bottom:10px;">請填寫作品標題</div>
        </div>
        <div class="form-group">
          <label>YouTube 連結</label>
          <input type="url" id="work-youtube" required style="width:100%;margin-bottom:10px;">
        </div>
        <button type="submit" class="auth-btn" style="width:100%;margin-top:8px;">送出</button>
        <button type="button" id="close-upload-modal" class="auth-btn" style="width:100%;margin-top:8px;background:#ccc;">取消</button>
      </form>
    </div>
  `;
  modal.querySelector('.modal-bg').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#close-upload-modal').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#work-upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const title = modal.querySelector('#work-title').value.trim();
    const youtubeUrl = modal.querySelector('#work-youtube').value.trim();
    if (!title || !youtubeUrl) return;
    // 嚴謹解析 YouTube ID
    function getYoutubeId(url) {
      let id = '';
      if (url.includes('youtu.be/')) {
        id = url.split('youtu.be/')[1].split(/[?&]/)[0];
      } else if (url.includes('watch?v=')) {
        id = url.split('watch?v=')[1].split(/[?&]/)[0];
      } else if (url.includes('/embed/')) {
        id = url.split('/embed/')[1].split(/[?&]/)[0];
      }
      return id;
    }
    const vid = getYoutubeId(youtubeUrl);
    const embedUrl = vid ? `https://www.youtube.com/embed/${vid}` : '';
    if (!embedUrl) {
      alert('YouTube 連結格式錯誤，請貼上正確的分享網址');
      return;
    }
    try {
      await window.FirebaseService.addWork({
        studentName: currentProfile.name || currentUser.email || '匿名',
        studentId: currentUser.uid,
        title,
        videoUrl: embedUrl,
        classId: currentProfile.classId || 'class-a',
        groupId: currentProfile.groupId || '',
        status: 'published',
        visible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('上傳成功！');
      modal.style.display = 'none';
      renderMyWorks();
    } catch (err) {
      alert('上傳失敗：' + err.message);
    }
  };
}
// 編輯作品（可擴充）
function editWork(workId) {
  alert('暫不支援編輯，請刪除後重新上傳。');
}
// 刪除作品
async function deleteWork(workId) {
  if (!confirm('確定要刪除這個作品嗎？')) return;
  try {
    await firebase.database().ref('works/' + workId).remove();
    alert('已刪除');
    renderMyWorks();
  } catch (err) {
    alert('刪除失敗：' + err.message);
  }
}
// 管理者初始化班級/組別
async function initClassesAndGroups() {
  if (!confirm('確定要初始化班級與組別？（此動作不可逆）')) return;
  try {
    // 範例：初始化三個班級與各自一個組別
    const classes = {
      'class-a': { id: 'class-a', name: '電子一甲' },
      'class-b': { id: 'class-b', name: '電子一乙' },
      'class-c': { id: 'class-c', name: '流音一乙' }
    };
    const groups = {
      'group-1': { id: 'group-1', name: '第一組', classId: 'class-a' },
      'group-2': { id: 'group-2', name: '第二組', classId: 'class-b' },
      'group-3': { id: 'group-3', name: '第三組', classId: 'class-c' }
    };
    await firebase.database().ref('classes').set(classes);
    await firebase.database().ref('groups').set(groups);
    alert('初始化完成！');
  } catch (err) {
    alert('初始化失敗：' + err.message);
  }
}

// 顯示建立組別 Modal
function showCreateGroupModal() {
  const modal = document.getElementById('upload-work-modal');
  modal.style.display = '';
  modal.innerHTML = `
    <div class="modal-bg" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:10000;"></div>
    <div class="modal-content" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:32px 24px;border-radius:12px;z-index:10001;max-width:400px;width:90vw;">
      <h2 style="margin-bottom:16px;">建立新組別</h2>
      <form id="create-group-form">
        <div class="form-group">
          <label>組別名稱</label>
          <input type="text" id="group-name" required style="width:100%;margin-bottom:10px;">
        </div>
        <div class="form-group">
          <label>所屬班級</label>
          <select id="group-class" required style="width:100%;margin-bottom:10px;">
            <option value="">請選擇班級</option>
            <option value="class-a">電子一甲</option>
            <option value="class-b">電子一乙</option>
            <option value="class-c">流音一乙</option>
          </select>
        </div>
        <div class="form-group">
          <label>組別描述（選填）</label>
          <textarea id="group-description" style="width:100%;margin-bottom:10px;height:60px;"></textarea>
        </div>
        <button type="submit" class="auth-btn" style="width:100%;margin-top:8px;">建立組別</button>
        <button type="button" id="close-create-group-modal" class="auth-btn" style="width:100%;margin-top:8px;background:#ccc;">取消</button>
      </form>
    </div>
  `;
  modal.querySelector('.modal-bg').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#close-create-group-modal').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#create-group-form').onsubmit = async (e) => {
    e.preventDefault();
    const groupName = modal.querySelector('#group-name').value.trim();
    const classId = modal.querySelector('#group-class').value;
    const description = modal.querySelector('#group-description').value.trim();
    
    if (!groupName || !classId) {
      alert('請填寫組別名稱和選擇班級');
      return;
    }
    
    try {
      const newGroupRef = firebase.database().ref('groups').push();
      const groupId = newGroupRef.key;
      const groupData = {
        id: groupId,
        name: groupName,
        classId: classId,
        description: description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await newGroupRef.set(groupData);
      alert('組別建立成功！');
      modal.style.display = 'none';
    } catch (err) {
      alert('建立組別失敗：' + err.message);
    }
  };
}

// 顯示匯入學生名單 Modal
function showImportStudentsModal() {
  const modal = document.getElementById('upload-work-modal');
  modal.style.display = '';
  modal.innerHTML = `
    <div class="modal-bg" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:10000;"></div>
    <div class="modal-content" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:32px 24px;border-radius:12px;z-index:10001;max-width:500px;width:90vw;">
      <h2 style="margin-bottom:16px;">匯入學生名單</h2>
      <div style="margin-bottom:16px;">
        <p style="font-size:0.9em;color:#666;margin-bottom:8px;">請選擇匯入方式：</p>
        <div style="margin-bottom:12px;">
          <input type="radio" id="import-csv" name="import-type" value="csv" checked>
          <label for="import-csv">CSV 檔案匯入</label>
        </div>
        <div style="margin-bottom:12px;">
          <input type="radio" id="import-manual" name="import-type" value="manual">
          <label for="import-manual">手動輸入</label>
        </div>
      </div>
      
      <div id="csv-import-section">
        <div class="form-group">
          <label>選擇 CSV 檔案</label>
          <input type="file" id="csv-file" accept=".csv" style="width:100%;margin-bottom:10px;">
          <small style="color:#666;">CSV 格式：姓名,學號,班級,組別,email</small>
        </div>
      </div>
      
      <div id="manual-import-section" style="display:none;">
        <div class="form-group">
          <label>學生資料（每行一個學生）</label>
          <textarea id="manual-students" placeholder="格式：姓名,學號,班級,組別,email&#10;例如：&#10;張小明,110123456,class-a,group-1,zhang@example.com&#10;李小華,110123457,class-a,group-1,li@example.com" style="width:100%;margin-bottom:10px;height:120px;"></textarea>
        </div>
      </div>
      
      <div class="form-group">
        <label>預設密碼</label>
        <input type="text" id="default-password" value="123456" style="width:100%;margin-bottom:10px;">
        <small style="color:#666;">新學生的預設密碼（可稍後修改）</small>
      </div>
      
      <button type="button" id="import-students-btn" class="auth-btn" style="width:100%;margin-top:8px;">開始匯入</button>
      <button type="button" id="close-import-modal" class="auth-btn" style="width:100%;margin-top:8px;background:#ccc;">取消</button>
    </div>
  `;
  
  // 切換匯入方式
  modal.querySelector('#import-csv').onchange = () => {
    modal.querySelector('#csv-import-section').style.display = '';
    modal.querySelector('#manual-import-section').style.display = 'none';
  };
  modal.querySelector('#import-manual').onchange = () => {
    modal.querySelector('#csv-import-section').style.display = 'none';
    modal.querySelector('#manual-import-section').style.display = '';
  };
  
  modal.querySelector('.modal-bg').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#close-import-modal').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#import-students-btn').onclick = async () => {
    const importType = modal.querySelector('input[name="import-type"]:checked').value;
    const defaultPassword = modal.querySelector('#default-password').value.trim();
    
    if (!defaultPassword) {
      alert('請設定預設密碼');
      return;
    }
    
    try {
      let students = [];
      
      if (importType === 'csv') {
        const file = modal.querySelector('#csv-file').files[0];
        if (!file) {
          alert('請選擇 CSV 檔案');
          return;
        }
        students = await parseCSVFile(file);
      } else {
        const manualData = modal.querySelector('#manual-students').value.trim();
        if (!manualData) {
          alert('請輸入學生資料');
          return;
        }
        students = parseManualData(manualData);
      }
      
      if (students.length === 0) {
        alert('沒有有效的學生資料');
        return;
      }
      
      await importStudents(students, defaultPassword);
      alert(`成功匯入 ${students.length} 名學生！`);
      modal.style.display = 'none';
    } catch (err) {
      alert('匯入失敗：' + err.message);
    }
  };
}

// 解析 CSV 檔案
function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        const students = [];
        
        for (let i = 1; i < lines.length; i++) { // 跳過標題行
          const columns = lines[i].split(',').map(col => col.trim());
          if (columns.length >= 5) {
            students.push({
              name: columns[0],
              studentId: columns[1],
              classId: columns[2],
              groupId: columns[3],
              email: columns[4]
            });
          }
        }
        resolve(students);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

// 解析手動輸入資料
function parseManualData(data) {
  const lines = data.split('\n').filter(line => line.trim());
  const students = [];
  
  for (const line of lines) {
    const columns = line.split(',').map(col => col.trim());
    if (columns.length >= 5) {
      students.push({
        name: columns[0],
        studentId: columns[1],
        classId: columns[2],
        groupId: columns[3],
        email: columns[4]
      });
    }
  }
  return students;
}

// 匯入學生資料
async function importStudents(students, defaultPassword) {
  const usersRef = firebase.database().ref('users');
  
  for (const student of students) {
    // 檢查是否已存在
    const existingUser = await usersRef.orderByChild('studentId').equalTo(student.studentId).once('value');
    if (existingUser.val()) {
      console.log(`學生 ${student.name} (${student.studentId}) 已存在，跳過`);
      continue;
    }
    
    // 建立新學生帳號
    const newUserRef = usersRef.push();
    const userId = newUserRef.key;
    const userData = {
      id: userId,
      uid: userId,
      name: student.name,
      studentId: student.studentId,
      classId: student.classId,
      groupId: student.groupId,
      role: 'student',
      email: student.email,
      password: defaultPassword, // 注意：實際應用中應該加密
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    await newUserRef.set(userData);
    console.log(`已建立學生帳號：${student.name} (${student.studentId})`);
  }
}

// 管理員專區顯示控制
function showAdminSection() {
  document.getElementById('admin-section').style.display = '';
  renderClassListByYear();
  renderGroupTable();
  renderAdminClassesList();
  renderGroupClassOptions();
  renderStudentTable();
  renderWorkTable();
  renderStudentFilters();
  renderWorkFilters();
  renderAdminComments();
}
// 渲染班級依年度分群
async function renderClassListByYear() {
  const classes = await window.FirebaseService.getClasses();
  const years = [...new Set(Object.values(classes||{}).map(cls => cls.year))].sort();
  const container = document.getElementById('class-list-by-year');
  container.innerHTML = '';
  years.forEach(year => {
    const yearDiv = document.createElement('div');
    yearDiv.style.marginBottom = '16px';
    yearDiv.innerHTML = `<div style="font-weight:bold;font-size:1.1em;margin-bottom:4px;">${year} 學年度</div>`;
    const table = document.createElement('table');
    table.className = 'class-table';
    table.style.width = '100%';
    table.innerHTML = `<thead><tr><th>班級ID</th><th>班級名稱</th><th>顯示</th><th>操作</th></tr></thead><tbody></tbody>`;
    Object.values(classes||{}).filter(cls => cls.year == year).forEach(cls => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${cls.id}</td>
        <td><input type="text" value="${cls.name}" data-id="${cls.id}" class="edit-class-name" style="width:100px;">${cls.visible===false ? '<span style=\"color:#e88;font-size:0.9em;\">（已隱藏）</span>' : ''}</td>
        <td>
          <input type="checkbox" ${cls.visible!==false?'checked':''} onchange="toggleClassVisible('${cls.id}', this.checked)">
        </td>
        <td>
          <button class="auth-btn" onclick="updateClass('${cls.id}')">儲存</button>
          <button class="auth-btn" style="background:#e88;" onclick="deleteClass('${cls.id}')">刪除</button>
        </td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
    yearDiv.appendChild(table);
    container.appendChild(yearDiv);
  });
  if (years.length === 0) {
    container.innerHTML = '<div style="color:#888;padding:12px;">尚無班級，請新增。</div>';
  }
}
// 新增班級
document.getElementById('add-class-form').onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById('add-class-id').value.trim();
  const name = document.getElementById('add-class-name').value.trim();
  const year = document.getElementById('add-class-year').value.trim();
  if (!id || !name || !year) return;
  try {
    await firebase.database().ref('classes/' + id).set({
      id, name, year,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    alert('新增成功！');
    renderClassListByYear();
    renderGroupClassOptions();
    e.target.reset();
  } catch (err) {
    alert('新增失敗：' + err.message);
  }
};
// 更新班級
window.updateClass = async function(id) {
  const name = document.querySelector(`.edit-class-name[data-id='${id}']`).value.trim();
  if (!name) return;
  try {
    await firebase.database().ref('classes/' + id + '/name').set(name);
    await firebase.database().ref('classes/' + id + '/updatedAt').set(new Date().toISOString());
    alert('班級更新成功！');
    renderClassListByYear();
  } catch (err) {
    alert('班級更新失敗：' + err.message);
  }
};
// 刪除班級
window.deleteClass = async function(id) {
  if (!confirm('確定要刪除這個班級嗎？')) return;
  try {
    await firebase.database().ref('classes/' + id).remove();
    alert('班級已刪除');
    renderClassListByYear();
  } catch (err) {
    alert('刪除班級失敗：' + err.message);
  }
};
// 新增評論管理渲染函數
async function renderAdminComments() {
  const card = document.getElementById('admin-comments-card');
  if (!card) return;
  card.style.display = '';
  const comments = await window.FirebaseService.getComments();
  const works = await window.FirebaseService.getWorks();
  const users = await window.FirebaseService.getUsers();
  const classes = await window.FirebaseService.getClasses();
  const groups = await window.FirebaseService.getGroups();
  // 篩選條件
  const search = document.getElementById('comment-search').value.trim();
  const classId = document.getElementById('comment-filter-class').value;
  const workId = document.getElementById('comment-filter-work').value;
  // 下拉選單初始化
  const classSel = document.getElementById('comment-filter-class');
  const workSel = document.getElementById('comment-filter-work');
  if (classSel.options.length <= 1) {
    classSel.innerHTML = '<option value="">全部班級</option>';
    Object.values(classes||{}).forEach(cls => {
      classSel.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
    });
  }
  if (workSel.options.length <= 1) {
    workSel.innerHTML = '<option value="">全部作品</option>';
    Object.values(works||{}).forEach(w => {
      workSel.innerHTML += `<option value="${w.id}">${w.title}</option>`;
    });
  }
  // 篩選評論
  const filtered = Object.values(comments||{}).filter(c => {
    if (classId && works[c.workId]?.classId !== classId) return false;
    if (workId && c.workId !== workId) return false;
    if (search) {
      const w = works[c.workId]||{};
      const u = users[c.reviewerId]||{};
      if (!(w.title?.includes(search) || u.name?.includes(search) || c.content?.includes(search))) return false;
    }
    return true;
  });
  // 渲染表格
  const tbody = document.getElementById('admin-comment-tbody');
  tbody.innerHTML = '';
  filtered.forEach(c => {
    const w = works[c.workId]||{};
    const u = users[c.reviewerId]||{};
    const cls = classes[u.classId]?.name || u.classId || '';
    const group = groups[u.groupId]?.name || u.groupId || '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${w.title||''}</td>
      <td>${c.reviewerName||''}</td>
      <td>${cls}</td>
      <td>${group}</td>
      <td>${c.rating||''}</td>
      <td>${c.content||''}</td>
      <td><button class="auth-btn" style="background:#e88;" onclick="deleteCommentAdmin('${c.id}')">刪除</button></td>
    `;
    tbody.appendChild(tr);
  });
}
// 綁定篩選事件
setTimeout(()=>{
  const search = document.getElementById('comment-search');
  const classSel = document.getElementById('comment-filter-class');
  const workSel = document.getElementById('comment-filter-work');
  if (search) search.oninput = renderAdminComments;
  if (classSel) classSel.onchange = renderAdminComments;
  if (workSel) workSel.onchange = renderAdminComments;
}, 1000);
// 刪除評論
window.deleteCommentAdmin = async function(id) {
  if (!confirm('確定要刪除這則評論？')) return;
  try {
    await firebase.database().ref('comments/' + id).remove();
    alert('已刪除！');
    renderAdminComments();
  } catch (err) {
    alert('刪除失敗：' + err.message);
  }
}
// ====== 補回 renderGroupClassOptions ======
async function renderGroupClassOptions() {
  const classes = await window.FirebaseService.getClasses();
  const select = document.getElementById('add-groups-class');
  if (!select) return;
  select.innerHTML = '<option value="">請選擇班級</option>';
  Object.values(classes || {}).forEach(cls => {
    select.innerHTML += `<option value="${cls.id}">${cls.name}（${cls.year}）</option>`;
  });
}
// ====== 補回管理員渲染函數 ======
// 組別管理
async function renderGroupTable(editMode = false) {
  const groups = await window.FirebaseService.getGroups();
  const classes = await window.FirebaseService.getClasses();
  const container = document.getElementById('group-list-by-class');
  container.innerHTML = '';
  // 依班級分群
  Object.values(classes || {}).forEach(cls => {
    const classGroups = Object.values(groups || {}).filter(g => g.classId === cls.id);
    if (classGroups.length === 0) return;
    const classDiv = document.createElement('div');
    classDiv.className = 'class-group';
    classDiv.innerHTML = `<div style="font-weight:bold;margin-bottom:6px;">${cls.name}（${cls.year}）</div>
      <div class="group-list">
        ${classGroups.map(group => `
          <span class="group-item">
            ${editMode ? `<input type='checkbox' class='group-checkbox' value='${group.id}' style='margin-right:4px;'>` : ''}
            ${group.name}
            ${editMode ? `<button class='auth-btn' style='margin-left:6px;background:#e88;' onclick='deleteGroup("${group.id}")'>刪除</button>` : ''}
          </span>
        `).join('')}
      </div>`;
    container.appendChild(classDiv);
  });
  // 若在編輯模式，顯示批次刪除按鈕
  if (editMode) {
    let batchBtn = document.getElementById('batch-delete-groups-btn');
    if (!batchBtn) {
      batchBtn = document.createElement('button');
      batchBtn.className = 'auth-btn';
      batchBtn.id = 'batch-delete-groups-btn';
      batchBtn.style.background = '#e88';
      batchBtn.style.marginBottom = '10px';
      batchBtn.textContent = '批次刪除勾選組別';
      container.parentElement.insertBefore(batchBtn, container);
    }
    batchBtn.onclick = async function() {
      const checked = Array.from(document.querySelectorAll('.group-checkbox:checked')).map(cb => cb.value);
      if (checked.length === 0) {
        alert('請先勾選要刪除的組別');
        return;
      }
      if (!confirm('確定要刪除這些組別嗎？')) return;
      for (const groupId of checked) {
        // 這裡直接刪除，不再 confirm
        await firebase.database().ref('groups/' + groupId).remove();
      }
      alert('已批次刪除！');
      renderGroupTable(true);
    };
  } else {
    // 非編輯模式移除批次刪除按鈕
    const batchBtn = document.getElementById('batch-delete-groups-btn');
    if (batchBtn) batchBtn.remove();
  }
  // 找到組別管理卡片
  const groupCard = document.querySelectorAll('.admin-card')[1];
  if (groupCard && !groupCard.querySelector('#edit-groups-btn')) {
    const editBtn = document.createElement('button');
    editBtn.className = 'auth-btn';
    editBtn.id = 'edit-groups-btn';
    editBtn.textContent = editMode ? '完成' : '編輯';
    editBtn.style.marginBottom = '10px';
    groupCard.insertBefore(editBtn, groupCard.children[2]); // 在h4和form之間
    let localEditMode = editMode;
    editBtn.onclick = function() {
      localEditMode = !localEditMode;
      renderGroupTable(localEditMode);
    };
  }
  const editBtn = document.getElementById('edit-groups-btn');
  if (editBtn) editBtn.textContent = editMode ? '完成' : '編輯';
}
// 補上 window.deleteGroup
window.deleteGroup = async function(groupId) {
  if (!confirm('確定要刪除這個組別嗎？')) return;
  try {
    await firebase.database().ref('groups/' + groupId).remove();
    alert('組別已刪除');
    renderGroupTable();
  } catch (err) {
    alert('刪除失敗：' + err.message);
  }
}
// 學生帳號管理
async function renderStudentTable(page = 1) {
  const users = await window.FirebaseService.getUsers();
  const classes = await window.FirebaseService.getClasses();
  const groups = await window.FirebaseService.getGroups();
  const year = document.getElementById('student-filter-year').value;
  const classId = document.getElementById('student-filter-class').value;
  const keyword = document.getElementById('student-search').value.trim();
  const tbody = document.getElementById('student-tbody');
  tbody.innerHTML = '';
  // 分頁邏輯
  const allStudents = Object.values(users || {}).filter(u => u.role === 'student').filter(u => {
    if (year && classes[u.classId]?.year != year) return false;
    if (classId && u.classId !== classId) return false;
    if (keyword && !(u.name?.includes(keyword) || u.studentId?.includes(keyword) || u.email?.includes(keyword))) return false;
    return true;
  });
  const pageSize = 15;
  const total = allStudents.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIdx = (currentPage - 1) * pageSize;
  const pageStudents = allStudents.slice(startIdx, startIdx + pageSize);
  pageStudents.forEach(u => {
    const tr = document.createElement('tr');
    const groupName = groups[u.groupId]?.name || u.groupId || '';
    tr.innerHTML = `
      <td>${u.name}</td>
      <td>${u.studentId}</td>
      <td>${classes[u.classId]?.name || u.classId}</td>
      <td>${groupName}</td>
      <td>${u.email}</td>
      <td><button class="auth-btn" onclick="editStudent('${u.id}')">編輯</button></td>
    `;
    tbody.appendChild(tr);
  });
  // 分頁按鈕
  const pagination = document.getElementById('student-pagination');
  pagination.innerHTML = '';
  if (totalPages > 1) {
    if (currentPage > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-button';
      prevBtn.textContent = '上一頁';
      prevBtn.onclick = () => renderStudentTable(currentPage - 1);
      pagination.appendChild(prevBtn);
    }
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = 'page-button' + (i === currentPage ? ' active' : '');
      pageBtn.textContent = i;
      if (i !== currentPage) pageBtn.onclick = () => renderStudentTable(i);
      pagination.appendChild(pageBtn);
    }
    if (currentPage < totalPages) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-button';
      nextBtn.textContent = '下一頁';
      nextBtn.onclick = () => renderStudentTable(currentPage + 1);
      pagination.appendChild(nextBtn);
    }
  }
}
// 作品展覽顯示控制
async function renderWorkTable() {
  const works = await window.FirebaseService.getWorks();
  const users = await window.FirebaseService.getUsers();
  const classes = await window.FirebaseService.getClasses();
  const groups = await window.FirebaseService.getGroups();
  const year = document.getElementById('work-filter-year').value;
  const classId = document.getElementById('work-filter-class').value;
  const tbody = document.getElementById('work-tbody');
  tbody.innerHTML = '';
  Object.values(works || {}).filter(w => {
    if (year && classes[w.classId]?.year != year) return false;
    if (classId && w.classId !== classId) return false;
    return true;
  }).forEach(w => {
    const tr = document.createElement('tr');
    // 組別名稱
    const groupName = groups[w.groupId]?.name || w.groupId || '';
    // 上傳日格式
    let uploadDate = '';
    if (typeof w.createdAt === 'string' && w.createdAt.includes('T')) {
      uploadDate = w.createdAt.split('T')[0];
    } else if (typeof w.createdAt === 'string') {
      uploadDate = w.createdAt;
    } else if (w.createdAt instanceof Date) {
      uploadDate = w.createdAt.toISOString().split('T')[0];
    }
    tr.innerHTML = `
      <td>${w.title}</td>
      <td>${users[w.studentId]?.name || w.studentId}</td>
      <td>${classes[w.classId]?.name || w.classId}</td>
      <td>${groupName}</td>
      <td>${uploadDate}</td>
      <td><input type="checkbox" ${w.visible!==false?'checked':''} onchange="toggleWorkVisible('${w.id}',this.checked)"></td>
      <td><button class="auth-btn" onclick="deleteWorkAdmin('${w.id}')">刪除</button></td>
    `;
    tbody.appendChild(tr);
  });
}
// 班級/組別/學生總覽
async function renderAdminClassesList() {
  const classes = await window.FirebaseService.getClasses();
  const groups = await window.FirebaseService.getGroups();
  const users = await window.FirebaseService.getUsers();
  const container = document.getElementById('admin-classes-list');
  container.innerHTML = '';
  Object.values(classes || {}).forEach(cls => {
    const classGroups = Object.values(groups || {}).filter(g => g.classId === cls.id);
    const classStudents = Object.values(users || {}).filter(u => u.classId === cls.id);
    const classDiv = document.createElement('div');
    classDiv.style.cssText = 'background:#fff;border-radius:8px;padding:16px;margin-bottom:16px;box-shadow:0 2px 4px #0001;';
    classDiv.innerHTML = `
      <h5 style="margin:0 0 8px 0;color:#333;">${cls.name} (${cls.id}) - ${cls.year}學年度</h5>
      <div><strong>組別：</strong>${classGroups.map(g => g.name).join('、') || '無'}</div>
      <div><strong>學生：</strong>${classStudents.map(u => u.name).join('、') || '無'}</div>
    `;
    container.appendChild(classDiv);
  });
  if (Object.keys(classes || {}).length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">尚無班級資料，請先新增班級。</div>';
  }
}
// ====== 學生帳號管理、作品展覽顯示控制 篩選下拉選單事件綁定 ======
function renderStudentFilters() {
  window.FirebaseService.getClasses().then(classes => {
    const yearSel = document.getElementById('student-filter-year');
    const classSel = document.getElementById('student-filter-class');
    if (yearSel && yearSel.options.length <= 1) {
      yearSel.innerHTML = '<option value="">全部學年</option>';
      const years = [...new Set(Object.values(classes||{}).map(cls => cls.year))].sort();
      years.forEach(year => {
        yearSel.innerHTML += `<option value="${year}">${year}</option>`;
      });
    }
    if (classSel && classSel.options.length <= 1) {
      classSel.innerHTML = '<option value="">全部班級</option>';
      Object.values(classes||{}).forEach(cls => {
        classSel.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
      });
    }
  });
  // 綁定事件
  document.getElementById('student-filter-year').onchange = () => renderStudentTable(1);
  document.getElementById('student-filter-class').onchange = () => renderStudentTable(1);
  document.getElementById('student-search').oninput = () => renderStudentTable(1);
}
function renderWorkFilters() {
  window.FirebaseService.getClasses().then(classes => {
    const yearSel = document.getElementById('work-filter-year');
    const classSel = document.getElementById('work-filter-class');
    if (yearSel && yearSel.options.length <= 1) {
      yearSel.innerHTML = '<option value="">全部學年</option>';
      const years = [...new Set(Object.values(classes||{}).map(cls => cls.year))].sort();
      years.forEach(year => {
        yearSel.innerHTML += `<option value="${year}">${year}</option>`;
      });
    }
    if (classSel && classSel.options.length <= 1) {
      classSel.innerHTML = '<option value="">全部班級</option>';
      Object.values(classes||{}).forEach(cls => {
        classSel.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
      });
    }
  });
  // 綁定事件
  document.getElementById('work-filter-year').onchange = renderWorkTable;
  document.getElementById('work-filter-class').onchange = renderWorkTable;
}
// ====== 批量建立組別 onsubmit 處理 ======
document.getElementById('add-groups-form').onsubmit = async (e) => {
  e.preventDefault();
  const classId = document.getElementById('add-groups-class').value;
  const count = parseInt(document.getElementById('add-groups-count').value, 10);
  if (!classId || !count || count < 1) {
    alert('請選擇班級並輸入正確的組別數量');
    return;
  }
  try {
    for (let i = 1; i <= count; i++) {
      const newGroupRef = firebase.database().ref('groups').push();
      await newGroupRef.set({
        id: newGroupRef.key,
        name: `第${i}組`,
        classId: classId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    alert('批量建立組別成功！');
    renderGroupTable();
    e.target.reset();
  } catch (err) {
    alert('建立失敗：' + err.message);
  }
};
// ====== 補上 showEditProfileModal ======
async function showEditProfileModal() {
  if (!currentProfile || !currentUser) {
    alert('無法取得個人資料，請重新登入');
    return;
  }
  const classes = await window.FirebaseService.getClasses();
  const groups = await window.FirebaseService.getGroups();
  const modal = document.getElementById('upload-work-modal');
  modal.style.display = '';
  // 班級下拉
  let classOptions = '';
  Object.values(classes || {}).forEach(cls => {
    classOptions += `<option value="${cls.id}"${currentProfile.classId===cls.id?' selected':''}>${cls.name}</option>`;
  });
  // 組別下拉（僅顯示所屬班級的組別）
  let groupOptions = '';
  Object.values(groups || {}).filter(g => g.classId === currentProfile.classId).forEach(g => {
    groupOptions += `<option value="${g.id}"${currentProfile.groupId===g.id?' selected':''}>${g.name}</option>`;
  });
  modal.innerHTML = `
    <div class="modal-bg" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:10000;"></div>
    <div class="auth-modal-content" style="z-index:10001;display:block;">
      <h2>編輯個人資料</h2>
      <form id="edit-profile-form">
        <label>姓名</label>
        <input type="text" id="edit-profile-name" value="${currentProfile?.name || ''}" required>
        <label>學號</label>
        <input type="text" id="edit-profile-studentid" value="${currentProfile?.studentId || ''}" required>
        <label>班級</label>
        <select id="edit-profile-classid" required>${classOptions}</select>
        <label>組別</label>
        <select id="edit-profile-groupid" required>${groupOptions}</select>
        <button type="submit" class="auth-btn" style="width:100%;margin-top:8px;">儲存</button>
        <button type="button" id="close-edit-profile-modal" class="auth-btn" style="width:100%;margin-top:8px;background:#ccc;">取消</button>
      </form>
    </div>
    <style>.auth-modal-content{z-index:10001 !important;display:block !important;}</style>
  `;
  // 動態切換組別下拉
  const classSel = modal.querySelector('#edit-profile-classid');
  const groupSel = modal.querySelector('#edit-profile-groupid');
  classSel.onchange = function() {
    const selectedClass = classSel.value;
    let groupOptions = '';
    Object.values(groups || {}).filter(g => g.classId === selectedClass).forEach(g => {
      groupOptions += `<option value="${g.id}">${g.name}</option>`;
    });
    groupSel.innerHTML = groupOptions;
  };
  modal.querySelector('.modal-bg').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#close-edit-profile-modal').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#edit-profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = modal.querySelector('#edit-profile-name').value.trim();
    const studentId = modal.querySelector('#edit-profile-studentid').value.trim();
    const classId = modal.querySelector('#edit-profile-classid').value;
    const groupId = modal.querySelector('#edit-profile-groupid').value;
    if (!name || !studentId || !classId || !groupId) {
      alert('請填寫完整資料');
      return;
    }
    try {
      // 修正：找到正確的 user key
      const users = await window.FirebaseService.getUsers();
      let userKey = null;
      Object.entries(users || {}).forEach(([key, user]) => {
        if (user.uid === currentUser.uid) userKey = key;
      });
      if (!userKey) {
        alert('找不到您的帳號資料，請聯絡管理員');
        return;
      }
      await firebase.database().ref('users/' + userKey).update({
        name, studentId, classId, groupId, updatedAt: new Date().toISOString()
      });
      alert('已更新！');
      modal.style.display = 'none';
      location.reload();
    } catch (err) {
      alert('更新失敗：' + err.message);
    }
  };
}
// ====== 作品展覽顯示控制 批次顯示/隱藏 ======
document.getElementById('batch-show-btn').onclick = async function() {
  const works = await window.FirebaseService.getWorks();
  const classes = await window.FirebaseService.getClasses();
  const year = document.getElementById('work-filter-year').value;
  const classId = document.getElementById('work-filter-class').value;
  const filtered = Object.values(works || {}).filter(w => {
    if (year && classes[w.classId]?.year != year) return false;
    if (classId && w.classId !== classId) return false;
    return true;
  });
  if (filtered.length === 0) { alert('沒有符合條件的作品'); return; }
  if (!confirm('確定要將這些作品全部設為「顯示」嗎？')) return;
  for (const w of filtered) {
    await firebase.database().ref('works/' + w.id + '/visible').set(true);
  }
  alert('批次顯示完成！');
  renderWorkTable();
};
document.getElementById('batch-hide-btn').onclick = async function() {
  const works = await window.FirebaseService.getWorks();
  const classes = await window.FirebaseService.getClasses();
  const year = document.getElementById('work-filter-year').value;
  const classId = document.getElementById('work-filter-class').value;
  const filtered = Object.values(works || {}).filter(w => {
    if (year && classes[w.classId]?.year != year) return false;
    if (classId && w.classId !== classId) return false;
    return true;
  });
  if (filtered.length === 0) { alert('沒有符合條件的作品'); return; }
  if (!confirm('確定要將這些作品全部設為「隱藏」嗎？')) return;
  for (const w of filtered) {
    await firebase.database().ref('works/' + w.id + '/visible').set(false);
  }
  alert('批次隱藏完成！');
  renderWorkTable();
};
window.editStudent = async function(id) {
  const users = await window.FirebaseService.getUsers();
  const classes = await window.FirebaseService.getClasses();
  const groups = await window.FirebaseService.getGroups();
  const user = users[id];
  if (!user) {
    alert('找不到學生資料');
    return;
  }
  // 產生班級下拉
  let classOptions = '';
  Object.values(classes || {}).forEach(cls => {
    classOptions += `<option value="${cls.id}"${user.classId===cls.id?' selected':''}>${cls.name}</option>`;
  });
  // 產生組別下拉（預設為該班級）
  function getGroupOptions(classId, selectedGroupId) {
    let opts = '';
    Object.values(groups || {}).filter(g => g.classId === classId).forEach(g => {
      opts += `<option value="${g.id}"${selectedGroupId===g.id?' selected':''}>${g.name}</option>`;
    });
    return opts;
  }
  let groupOptions = getGroupOptions(user.classId, user.groupId);
  const modalId = 'edit-student-modal';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.4)';
    modal.style.zIndex = '100000';
    modal.innerHTML = `
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff7f7;padding:32px 24px 24px 24px;border-radius:14px;max-width:350px;width:92vw;box-shadow:0 4px 24px #b6868620;">
        <h2 style="color:#b77;font-size:1.2em;margin-bottom:18px;text-align:center;">編輯學生資料</h2>
        <div class="modal-content">
          <form id="edit-student-form">
            <label>姓名</label>
            <input type="text" id="edit-student-name" value="${user.name||''}" required>
            <label>學號</label>
            <input type="text" id="edit-student-studentid" value="${user.studentId||''}" required>
            <label>班級</label>
            <select id="edit-student-classid" required>${classOptions}</select>
            <label>組別</label>
            <select id="edit-student-groupid" required>${groupOptions}</select>
            <button type="submit" class="auth-btn">儲存</button>
            <button type="button" id="close-edit-student-modal" class="auth-btn">取消</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = '';
    // 更新下拉內容
    modal.querySelector('#edit-student-classid').innerHTML = classOptions;
    modal.querySelector('#edit-student-groupid').innerHTML = groupOptions;
    modal.querySelector('#edit-student-name').value = user.name||'';
    modal.querySelector('#edit-student-studentid').value = user.studentId||'';
  }
  // 關閉Modal
  modal.querySelector('#close-edit-student-modal').onclick = () => { modal.style.display = 'none'; };
  // 切換班級時，組別下拉自動更新
  const classSel = modal.querySelector('#edit-student-classid');
  const groupSel = modal.querySelector('#edit-student-groupid');
  classSel.onchange = function() {
    groupSel.innerHTML = getGroupOptions(classSel.value, '');
  };
  // 送出表單
  modal.querySelector('#edit-student-form').onsubmit = async function(e) {
    e.preventDefault();
    const name = modal.querySelector('#edit-student-name').value.trim();
    const studentId = modal.querySelector('#edit-student-studentid').value.trim();
    const classId = classSel.value;
    const groupId = groupSel.value;
    if (!name || !studentId || !classId || !groupId) {
      alert('請填寫完整資料');
      return;
    }
    try {
      await firebase.database().ref('users/' + id).update({
        name,
        studentId,
        classId,
        groupId,
        updatedAt: new Date().toISOString()
      });
      alert('已更新！');
      modal.style.display = 'none';
      renderStudentTable(1);
    } catch (err) {
      alert('更新失敗：' + err.message);
    }
  };
}
// 新增 toggleClassVisible
window.toggleClassVisible = async function(classId, visible) {
  await firebase.database().ref('classes/' + classId + '/visible').set(!!visible);
  renderClassListByYear();
  renderGroupClassOptions && renderGroupClassOptions();
}