auth-containerdeleteComment// 讀取並顯示所有作品
async function renderWorksExhibition() {
  try {
    const works = await window.FirebaseService.getWorks();
    const worksArray = Object.values(works || {});

    // 依班級分類
    const classSections = {
      'class-a': document.getElementById('class-a'),
      'class-b': document.getElementById('class-b'),
      'class-c': document.getElementById('class-c')
    };

    // 清空內容
    Object.values(classSections).forEach(section => {
      if (section) section.innerHTML = '';
    });

    // 為每個班級添加標題
    Object.keys(classSections).forEach(classId => {
      const section = classSections[classId];
      if (section) {
        const classTitle = document.createElement('h3');
        classTitle.classList.add('fade-in');
        classTitle.textContent = `${getClassName(classId)}作品`;
        section.appendChild(classTitle);
      }
    });

    worksArray.forEach(work => {
      if (!work || !work.videoUrl) return;

      // 建立作品卡片
      const workItem = document.createElement('div');
      workItem.classList.add('work-item');
      const cardContent = document.createElement('div');
      cardContent.classList.add('card-content');
      // 學生姓名
      const studentName = document.createElement('div');
      studentName.classList.add('student-name');
      studentName.textContent = work.studentName || '未知學生';
      cardContent.appendChild(studentName);
      // 視頻容器
      const videoContainer = document.createElement('div');
      videoContainer.classList.add('video-container');
      // 創建預覽圖容器
      const videoPreview = document.createElement('div');
      videoPreview.classList.add('video-preview');
      // 從 YouTube URL 提取視頻 ID
      const videoId = getYoutubeId(work.videoUrl);
      if (videoId) {
        videoPreview.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)`;
        const playButton = document.createElement('div');
        playButton.classList.add('play-button');
        videoPreview.appendChild(playButton);
        videoPreview.addEventListener('click', function() {
          const loadingIndicator = document.createElement('div');
          loadingIndicator.classList.add('loading-indicator');
          videoContainer.appendChild(loadingIndicator);
          const iframe = document.createElement('iframe');
          iframe.src = `${work.videoUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
          iframe.title = "YouTube video player";
          iframe.frameBorder = "0";
          iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
          iframe.allowFullscreen = true;
          iframe.onload = function() {
            loadingIndicator.remove();
          };
          videoPreview.remove();
          videoContainer.appendChild(iframe);
        });
      }
      videoContainer.appendChild(videoPreview);
      cardContent.appendChild(videoContainer);
      // 作品標題
      const workTitle = document.createElement('div');
      workTitle.classList.add('work-title');
      workTitle.textContent = work.title || '未命名作品';
      cardContent.appendChild(workTitle);
      // 組別資訊
      if (work.groupId) {
        const groupInfo = document.createElement('div');
        groupInfo.classList.add('group-info');
        groupInfo.textContent = `組別：${work.groupId}`;
        cardContent.appendChild(groupInfo);
      }
      workItem.appendChild(cardContent);
      // 加到對應班級
      const targetSection = classSections[work.classId];
      if (targetSection) {
        let worksGrid = targetSection.querySelector('.works-grid');
        if (!worksGrid) {
          worksGrid = document.createElement('div');
          worksGrid.classList.add('works-grid');
          targetSection.appendChild(worksGrid);
        }
        worksGrid.appendChild(workItem);
      }
    });
    console.log('作品展資料載入完成');
  } catch (error) {
    console.error('載入作品展資料失敗:', error);
  }
}

function getClassName(classId) {
  const classNames = {
    'class-a': '電子一甲',
    'class-b': '電子一乙',
    'class-c': '流音一乙'
  };
  return classNames[classId] || classId;
}

function getYoutubeId(url) {
  let id = '';
  if (url.includes('youtu.be/')) {
    id = url.split('youtu.be/')[1].split(/[?&]/)[0];
  } else if (url.includes('watch?v=')) {
    id = url.split('watch?v=')[1].split(/[?&]/)[0];
  }
  return id;
}

function bindEvents() {
  const workItems = document.querySelectorAll('.work-item');
  workItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.classList.add('hover');
    });
    item.addEventListener('mouseleave', function() {
      this.classList.remove('hover');
    });
  });
  const fadeElements = document.querySelectorAll('.fade-in');
  setTimeout(() => {
    fadeElements.forEach(element => {
      element.classList.add('visible');
    });
  }, 100);
}

document.addEventListener('DOMContentLoaded', function() {
  const classButtons = document.querySelectorAll('.class-btn');
  const worksContainers = document.querySelectorAll('.works-container');
  classButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetClass = this.getAttribute('data-class');
      classButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      worksContainers.forEach(container => {
        container.classList.remove('active');
      });
      document.getElementById(targetClass).classList.add('active');
      document.getElementById(targetClass).scrollIntoView({
        behavior: 'auto',
        block: 'start'
      });
    });
  });
  if (window.FirebaseService) {
    renderWorksExhibition();
  } else {
    setTimeout(renderWorksExhibition, 1000);
  }
  bindEvents();
});

// 顯示/隱藏上傳作品按鈕
function updateUploadWorkBtn(user) {
  const btn = document.getElementById('upload-work-btn');
  if (!btn) return;
  btn.style.display = user ? '' : 'none';
}

// 顯示上傳作品 Modal
function showUploadWorkModal(user) {
  const modal = document.getElementById('upload-work-modal');
  if (!modal) return;
  modal.style.display = '';
  modal.innerHTML = `
    <div class="modal-bg" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:10000;"></div>
    <div class="modal-content" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:32px 24px;border-radius:12px;z-index:10001;max-width:350px;width:90vw;">
      <h2 style="margin-bottom:16px;">上傳新作品</h2>
      <form id="work-upload-form">
        <div class="form-group">
          <label>作品標題</label>
          <input type="text" id="work-title" required style="width:100%;margin-bottom:10px;">
        </div>
        <div class="form-group">
          <label>YouTube 連結</label>
          <input type="url" id="work-youtube" required style="width:100%;margin-bottom:10px;">
        </div>
        <div class="form-group">
          <label>組別</label>
          <input type="text" id="work-group" required style="width:100%;margin-bottom:10px;">
        </div>
        <button type="submit" class="auth-btn" style="width:100%;margin-top:8px;">送出</button>
        <button type="button" id="close-upload-modal" class="auth-btn" style="width:100%;margin-top:8px;background:#ccc;">取消</button>
      </form>
    </div>
  `;
  // 關閉事件
  modal.querySelector('.modal-bg').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#close-upload-modal').onclick = () => { modal.style.display = 'none'; };
  // 表單送出
  modal.querySelector('#work-upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const title = modal.querySelector('#work-title').value.trim();
    const youtubeUrl = modal.querySelector('#work-youtube').value.trim();
    const groupId = modal.querySelector('#work-group').value.trim();
    if (!title || !youtubeUrl || !groupId) return;
    // 轉換 YouTube 連結為 /embed/ 格式
    let embedUrl = youtubeUrl;
    if (youtubeUrl.includes('watch?v=')) {
      const vid = youtubeUrl.split('watch?v=')[1].split('&')[0].split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${vid}`;
    } else if (youtubeUrl.includes('youtu.be/')) {
      const vid = youtubeUrl.split('youtu.be/')[1].split('?')[0].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${vid}`;
    }
    // 取得班級ID（預設 class-a，可依登入者資訊調整）
    const classId = 'class-a';
    // 呼叫 Firebase 新增作品
    try {
      await window.FirebaseService.addWork({
        studentName: user.displayName || user.email || '匿名',
        studentId: user.uid,
        title,
        videoUrl: embedUrl,
        classId,
        groupId,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('上傳成功！');
      modal.style.display = 'none';
      renderWorksExhibition();
    } catch (err) {
      alert('上傳失敗：' + err.message);
    }
  };
}

// 顯示/隱藏個人專區按鈕
function updateProfileLink(user) {
  const link = document.getElementById('profile-link');
  if (!link) return;
  link.style.display = user ? '' : 'none';
}

// 監聽登入狀態
if (window.firebase && window.firebase.auth) {
  window.firebase.auth().onAuthStateChanged(user => {
    updateProfileLink(user);
    updateUploadWorkBtn(user);
    const btn = document.getElementById('upload-work-btn');
    if (btn) {
      btn.onclick = () => showUploadWorkModal(user);
    }
  });
}

if (profile.role === 'admin') {
  // 顯示班級/組別管理、初始化按鈕
} else if (profile.role === 'teacher') {
  // 顯示老師功能
} else {
  // 只顯示個人作品管理
}

