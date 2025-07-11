// Firebase 設定範例檔案
// 請複製此檔案為 firebase-config.js 並填入您的 Firebase 專案設定

/*
如何取得 Firebase 專案設定：

1. 前往 Firebase Console: https://console.firebase.google.com/
2. 建立新專案或選擇現有專案
3. 在專案設定中，點擊「新增應用程式」
4. 選擇「Web」平台
5. 註冊應用程式後，您會看到類似以下的設定：

const firebaseConfig = {
  apiKey: "AIzaSyC_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "your-project-name.firebaseapp.com",
  databaseURL: "https://your-project-name-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "your-project-name",
  storageBucket: "your-project-name.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

6. 複製這些設定到 firebase-config.js 檔案中

注意事項：
- 請將 firebase-config.js 加入 .gitignore 以避免洩露敏感資訊
- 在生產環境中，建議使用環境變數來管理這些設定
- 確保已啟用 Firebase Authentication 和 Realtime Database
*/

// 範例設定（請替換為您的實際設定）
const firebaseConfig = {
  apiKey: "AIzaSyC10Nv4oS8cOP_bJ6729b4OoKiD6FO0s-A",
  authDomain: "app1-7c1ad.firebaseapp.com",
  databaseURL: "https://app1-7c1ad-default-rtdb.firebaseio.com",
  projectId: "app1-7c1ad",
  storageBucket: "app1-7c1ad.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Firebase 初始化
firebase.initializeApp(firebaseConfig);

// 取得 Firebase 服務
const auth = firebase.auth();
const database = firebase.database();

// 資料庫參考
const dbRef = {
  classes: database.ref('classes'),
  groups: database.ref('groups'),
  works: database.ref('works'),
  comments: database.ref('comments'),
  users: database.ref('users'),
  settings: database.ref('settings')
};

// 基本資料庫操作函數
const FirebaseService = {
  // 測試連線
  async testConnection() {
    try {
      await database.ref('.info/connected').once('value');
      console.log('Firebase 連線成功');
      return true;
    } catch (error) {
      console.error('Firebase 連線失敗:', error);
      return false;
    }
  },
  
  // 取得班級資料
  async getClasses() {
    try {
      const snapshot = await database.ref('classes').once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('取得班級資料失敗:', error);
      return {};
    }
  },
  
  // 取得作品資料
  async getWorks() {
    try {
      const snapshot = await database.ref('works').once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('取得作品資料失敗:', error);
      return {};
    }
  },
  
  // 取得評論資料
  async getComments() {
    try {
      const snapshot = await database.ref('comments').once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('取得評論資料失敗:', error);
      return {};
    }
  },
  
  // 取得組別資料
  async getGroups() {
    try {
      const snapshot = await database.ref('groups').once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('取得組別資料失敗:', error);
      return {};
    }
  },
  
  // 取得所有使用者
  async getUsers() {
    try {
      const snapshot = await database.ref('users').once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('取得使用者資料失敗:', error);
      return {};
    }
  },
  
  // 取得當前使用者資料
  async getCurrentUserProfile(uid) {
    try {
      const snapshot = await database.ref('users').orderByChild('uid').equalTo(uid).once('value');
      const users = snapshot.val();
      if (users) {
        return Object.values(users)[0];
      }
      return null;
    } catch (error) {
      console.error('取得使用者資料失敗:', error);
      return null;
    }
  },
  
  // 新增作品
  async addWork(workData) {
    try {
      const newWorkRef = database.ref('works').push();
      const workId = newWorkRef.key;
      const work = {
        id: workId,
        ...workData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await newWorkRef.set(work);
      console.log('作品新增成功:', workId);
      return workId;
    } catch (error) {
      console.error('新增作品失敗:', error);
      throw error;
    }
  },
  
  // 新增或更新評論（同一學生對同一作品只能有一筆）
  async addOrUpdateComment(commentData) {
    try {
      // 先查詢是否已存在同 reviewerId + workId 的評論
      const snapshot = await database.ref('comments')
        .orderByChild('workId')
        .equalTo(commentData.workId)
        .once('value');
      let existingId = null;
      snapshot.forEach(child => {
        const c = child.val();
        if (c.reviewerId === commentData.reviewerId) {
          existingId = c.id;
        }
      });
      if (existingId) {
        // 更新
        await database.ref('comments/' + existingId).update({
          ...commentData,
          updatedAt: new Date().toISOString()
        });
        console.log('評論已更新:', existingId);
        return existingId;
      } else {
        // 新增
        const newCommentRef = database.ref('comments').push();
        const commentId = newCommentRef.key;
        const comment = {
          id: commentId,
          ...commentData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await newCommentRef.set(comment);
        console.log('評論新增成功:', commentId);
        return commentId;
      }
    } catch (error) {
      console.error('新增/更新評論失敗:', error);
      throw error;
    }
  },
  
  // 刪除評論
  async deleteComment(commentId) {
    try {
      await database.ref('comments/' + commentId).remove();
      console.log('評論已刪除:', commentId);
      return true;
    } catch (error) {
      console.error('刪除評論失敗:', error);
      throw error;
    }
  },
  
  // 新增或更新用戶資料
  async addUser(userData) {
    try {
      // 先查詢是否已存在相同 uid
      const snapshot = await database.ref('users').orderByChild('uid').equalTo(userData.uid).once('value');
      const users = snapshot.val();
      if (users) {
        // 已存在，取第一個 key
        const key = Object.keys(users)[0];
        await database.ref('users/' + key).update({
          ...userData,
          updatedAt: new Date().toISOString()
        });
        console.log('使用者已更新:', key);
        return key;
      } else {
        // 不存在才新增
        const newUserRef = database.ref('users').push();
        const userId = newUserRef.key;
        const user = {
          id: userId,
          ...userData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await newUserRef.set(user);
        console.log('使用者新增成功:', userId);
        return userId;
      }
    } catch (error) {
      console.error('新增/更新使用者失敗:', error);
      throw error;
    }
  },
  
  // 新增組別
  async addGroup(groupData) {
    try {
      const newGroupRef = database.ref('groups').push();
      const groupId = newGroupRef.key;
      const group = {
        id: groupId,
        ...groupData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await newGroupRef.set(group);
      console.log('組別新增成功:', groupId);
      return groupId;
    } catch (error) {
      console.error('新增組別失敗:', error);
      throw error;
    }
  },
  
  // 初始化資料庫結構
  async initializeDatabase() {
    try {
      // 建立預設設定
      await database.ref('settings').set({
        evaluation: {
          enabled: true,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天後
          maxRating: 5,
          allowSelfReview: false,
          allowCrossClassReview: true
        },
        upload: {
          enabled: true,
          maxVideoDuration: 300,
          allowedDomains: ["youtube.com", "youtu.be"]
        }
      });
      
      console.log('資料庫初始化完成');
    } catch (error) {
      console.error('資料庫初始化失敗:', error);
    }
  }
};

// 匯出服務
window.FirebaseService = FirebaseService;

// 頁面載入時測試連線
document.addEventListener('DOMContentLoaded', async () => {
  const isConnected = await FirebaseService.testConnection();
});

// 檢查 groups 的實際結構
window.FirebaseService.getGroups().then(groups => {
  console.log('Groups 結構:', groups);
  console.log('Groups keys:', Object.keys(groups));
  
  // 檢查第一個組別的結構
  const firstGroup = Object.values(groups)[0];
  console.log('第一個組別:', firstGroup);
}); 
