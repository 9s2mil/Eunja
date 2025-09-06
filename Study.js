let randomMode = false;
let randomSequence = [];
let randomIndex = 0;
let randomPlayInterval = null;
let autoLoopEnabled = false;
let autoLoopDelaySec = null;
let autoLoopTimeout = null;
let isPaused = false;

//⚔️메인 주제열기
function openPopup(num) {
    const curtain = document.querySelector('.curtain');
    const first = document.getElementById(`title${num}-1`);
    if (!first) { alert(`title${num}-1이 아직 없습니다. 자료를 먼저 불러오시오.`); return; }
    first.style.display = "block";
    if (curtain) curtain.style.display = "block";
    updateGoToPopupButtonLabel();
}

// 5번: JSON 생성 후 열기 (이미 이 형태면 유지)
async function title5Open() {
    await loadTitleFromJson(5, 'title-5.json');
    setLastYForX?.(5, 1);
    openPopup(5);
}

function title1Open() { openPopup(1); }
function title2Open() { openPopup(2); }
function title3Open() { openPopup(3); }
function title4Open() { openPopup(4); }
async function title5Open() {
    await renderPopupFromJSON('title-5.json', '#popupContainer');
    openPopup(5);
}
function title6Open() { openPopup(6); }
function title7Open() { openPopup(7); }
function title8Open() { openPopup(8); }

//헤더 버튼
//🌊페이지 이동 팝업열기
function goToPopup() {
    const popup = document.getElementById("goToPopup");
    popup.style.display = "block";
    
    // 팝업 열리자마자 인풋창에 자동으로 포커스를 줌
    const inputElement = document.getElementById("popupMoveInput");
    if (inputElement) {
        inputElement.focus();
    }
}
//🌊페이지 이동 팝업닫기
function closeGoToPopup() {
    const popup = document.getElementById("goToPopup");
        popup.style.display = "none";
}
//🌊페이지 이동 버튼 이름 변경
function updateGoToPopupButtonLabel() {
    const button = document.getElementById("goToPopupButton");
    const currentPopup = document.querySelector(".popup[style*='display: block']");

    if (!button) return;

    if (!currentPopup) {
        button.textContent = "🌊";
        return;
    }

    const match = currentPopup.id.match(/title(\d+)-(\d+)/);
    if (!match) {
        button.textContent = "🌊";
        return;
    }

    let x = match[1];
    let y = parseInt(match[2]);
    let maxY = 1;

    document.querySelectorAll(`.popup[id^="title${x}-"]`).forEach(popup => {
        const matchInner = popup.id.match(/title\d+-(\d+)/);
        if (matchInner) {
            let yVal = parseInt(matchInner[1]);
            if (yVal > maxY) maxY = yVal;
        }
    });

    button.textContent = `${y}/${maxY}`;
}
//🌊페이지 이동 로직
function moveToSpecificPopup() {
    const input = document.getElementById("popupMoveInput");
    const valueRaw = input.value.trim();

    // 현재 열린 팝업 찾기
    const currentPopup = document.querySelector(".popup[style*='display: block']");
    if (!currentPopup) return;

    const match = currentPopup.id.match(/title(\d+)-(\d+)/);
    if (!match) return;

    const x = match[1];

    // 같은 x 그룹의 최대 y 찾기
    let maxY = 1;
    document.querySelectorAll(`.popup[id^="title${x}-"]`).forEach(popup => {
        const innerMatch = popup.id.match(/title\d+-(\d+)/);
        if (innerMatch) {
            const yVal = parseInt(innerMatch[1]);
            if (yVal > maxY) maxY = yVal;
        }
    });

    // 앞에 0이 붙은 경우 → 자동 루프 시작
    if (/^0\d+$/.test(valueRaw)) {
        const delaySec = parseInt(valueRaw, 10); // 앞자리 0은 제거됨
        autoLoopDelaySec = delaySec;
        autoLoopEnabled = true;

        clearTimeout(autoLoopTimeout);

        // 💡 두 버튼을 표시
        document.querySelector(".pauseLoopButton").style.display = "block";
        document.querySelector(".stopLoopButton").style.display = "block";

        function runAutoLoop() {
            if (!autoLoopEnabled) return;

            document.querySelector("#curtainUpDownButton").click();

            setTimeout(() => {
                document.querySelector("#nextPopupButton").click();
                autoLoopTimeout = setTimeout(runAutoLoop, autoLoopDelaySec * 1000);
            }, 1000);
        }

        runAutoLoop();
        closeGoToPopup();
        input.value = "";
        return;
    }

    // 일반 정수 입력 → 해당 팝업으로 이동
    const value = parseInt(valueRaw, 10);
    if (value >= 1 && value <= maxY) {
        const newPopup = document.getElementById(`title${x}-${value}`);
        if (newPopup) {
            currentPopup.style.display = "none";
            newPopup.style.display = "block";

            updateGoToPopupButtonLabel();
            closeGoToPopup();
            input.value = "";

            triggerGoldFlash(newPopup);
        }
    }

    // 기타 입력은 무시 (예: 0, maxY 초과 등)
}

//🌊페이지 이동 후 애니메이션
function triggerGoldFlash(element) {
    element.classList.add("gold-flash");
    setTimeout(() => {
        element.classList.remove("gold-flash");
    }, 700); 
}
//🌪️랜덤플레이/정상화
function randomPopupOpen() {
    randomMode = !randomMode;
    console.log("랜덤 모드:", randomMode ? "ON" : "OFF");

    const button = document.getElementById("randomPlayButton");
    if (randomMode) {

        const currentPopup = document.querySelector(".popup[style*='display: block']");
        if (!currentPopup) return;

        const match = currentPopup.id.match(/title(\d+)-(\d+)/);
        if (!match) return;

        let x = match[1];
        let maxY = 1;

        document.querySelectorAll(`.popup[id^="title${x}-"]`).forEach(popup => {
            const match = popup.id.match(/title\d+-(\d+)/);
            if (match) {
                let y = parseInt(match[1]);
                if (y > maxY) maxY = y;
            }
        });

        randomSequence = Array.from({ length: maxY }, (_, i) => i + 1);
        shuffle(randomSequence);
        randomIndex = 0;
        console.log(`랜덤 순서 (title${x}):`, randomSequence);
    } else {
        randomSequence = [];
        randomIndex = 0;
    }
}
//🌪️랜덤플레이
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
//🌪️랜덤플레이
function goToNextRandomPopup(x) {
    if (!randomMode || randomIndex >= randomSequence.length) return;

    const currentPopup = document.querySelector(".popup[style*='display: block']");
    const nextY = randomSequence[randomIndex];
    randomIndex++;

    const newPopup = document.getElementById(`title${x}-${nextY}`);
    if (newPopup && currentPopup !== newPopup) {
        currentPopup.style.display = "none";
        newPopup.style.display = "block";
        updateGoToPopupButtonLabel();
        triggerGoldFlash(newPopup);
    }

    if (randomIndex >= randomSequence.length) {
        shuffle(randomSequence);
        randomIndex = 0;
        console.log("랜덤 순서 재생성:", randomSequence);
    }
}
//❄️휘장 보이기/지우기
function curtainHidden() {
    var curtain = document.querySelector('.curtain'); 
    
    if (curtain.style.background === "rgba(0, 0, 0, 0)") {
        curtain.style.background = "linear-gradient(to bottom, #8B0000, #B22222)";
        curtain.style.border = "7px solid gold"; 
    } else {
        curtain.style.background = "rgba(0, 0, 0, 0)";  
        curtain.style.border = "none"; 
    }
    curtain.style.display = "block";
}
//⚡발음 보이기/가리기
function rtHidden() {
    const rtElements = document.querySelectorAll('rt');

    rtElements.forEach(function(rt) {
        const currentVisibility = window.getComputedStyle(rt).visibility;

        // 순서 변경: 안 보이면 보이게, 아니면 숨김
        if (currentVisibility === 'hidden') {
            rt.style.visibility = 'visible';
        } else {
            rt.style.visibility = 'hidden';
        }
    });
}

//🔥팝업닫기
function closePopup() {
    // 기존 팝업 전부 닫기
    const popups = document.querySelectorAll('.popup');
    popups.forEach(function(popup) {
        popup.style.display = 'none';
    });

    // 커튼 숨기기
    const curtain = document.querySelector('.curtain');
    curtain.style.display = "none";

    // 페이지 이동 버튼 갱신
    updateGoToPopupButtonLabel();

    // 🌪️ 랜덤모드 종료 처리
    if (randomMode) {
        randomMode = false;
        randomSequence = [];
        randomIndex = 0;
    }

    // 🔁 자동루프 종료 + 버튼 숨김
    if (autoLoopEnabled) {
        autoLoopEnabled = false;
        clearTimeout(autoLoopTimeout);
        isPaused = false;

        // 버튼 숨김
        document.querySelector(".pauseLoopButton").style.display = "none";
        document.querySelector(".stopLoopButton").style.display = "none";
    }
}


//푸터 버튼
//🗡️이전 팝업 열기
function prevPopup() {
    movePopup(-1);
    var curtain = document.querySelector('.curtain'); 
    curtain.style.display = "block"; 
}
//🛡️휘장 올리기/내리기
function curtainUpDown() {
    var curtain = document.querySelector('.curtain'); 
    if (curtain.style.display === "none" || curtain.style.display === "") {
        curtain.style.display = "block"; 
    } else {
        curtain.style.display = "none"; 
    }
}
//⚔️다음 팝업 열기        
function nextPopup() {
    const currentPopup = document.querySelector(".popup[style*='display: block']");
    if (!currentPopup) return;

    const match = currentPopup.id.match(/title(\d+)-(\d+)/);
    if (!match) return;

    let x = match[1];
    let currentY = parseInt(match[2]);

    if (randomMode) {
        if (randomIndex >= randomSequence.length) {
            // 랜덤 시퀀스 끝나면 리셋
            shuffle(randomSequence);
            randomIndex = 0;
        }

        const nextY = randomSequence[randomIndex];
        randomIndex++;

        const nextPopup = document.getElementById(`title${x}-${nextY}`);
        if (nextPopup) {
            currentPopup.style.display = "none";
            nextPopup.style.display = "block";
            updateGoToPopupButtonLabel();
            var curtain = document.querySelector('.curtain'); 
            curtain.style.display = "block"; 
        }
    } else {
        // 기존 순차 방식
        const nextPopup = document.getElementById(`title${x}-${currentY + 1}`);
        if (nextPopup) {
            currentPopup.style.display = "none";
            nextPopup.style.display = "block";
            updateGoToPopupButtonLabel();
            var curtain = document.querySelector('.curtain'); 
            curtain.style.display = "block"; 
        }
    }
}
//🗡️/⚔️이전/다음 팝업 이동 함수
function movePopup(direction) {
    const currentPopup = document.querySelector(".popup[style*='display: block']");
    if (!currentPopup) return;

    const match = currentPopup.id.match(/title(\d+)-(\d+)/);
    if (!match) return;

    let x = match[1]; // 앞자리 숫자 (X)
    let y = parseInt(match[2]); // 현재 Y값

    if (randomMode) {
        // 랜덤 모드에서는 순서대로 이동
        let newIndex = randomIndex + direction;
        if (newIndex < 0 || newIndex >= randomSequence.length) return; // 범위 초과 방지
        
        randomIndex = newIndex;
        let newPopupId = `title${x}-${randomSequence[randomIndex]}`;
        let newPopup = document.getElementById(newPopupId);

        if (newPopup) {
            currentPopup.style.display = "none";
            newPopup.style.display = "block";
        }
    } else {
        // 일반 모드에서는 순차 이동
        let newPopupId = `title${x}-${y + direction}`;
        let newPopup = document.getElementById(newPopupId);

        if (newPopup) {
            currentPopup.style.display = "none";
            newPopup.style.display = "block";
        }
    }
    updateGoToPopupButtonLabel();

}

// 키보드 이벤트 추가
document.addEventListener("keydown", function (event) {
    //푸터 버튼 제어
    if (event.key === "ArrowLeft") {// 왼쪽 방향키: 이전 페이지🗡️
        document.getElementById("prevPopupButton").click();
    } else if (event.key === "ArrowRight") {// 오른쪽 방향키: 다음 페이지⚔️
        document.getElementById("nextPopupButton").click();
    }  else if (event.key === "Control") {// 스페이스 바: 휘장 보이기/가리기🛡️
        document.getElementById("curtainUpDownButton").click();
    } 
    //헤더 버튼 제어
    else if (event.key === "F2") {// F2: 페이지 이동 팝업 열기🌊
        document.getElementById("goToPopupButton").click();
    }  else if (event.key === "Enter") {// Enter: 페이지 이동 버튼🌊
        const goToPopup = document.getElementById("goToPopup");
        if (goToPopup && goToPopup.style.display === "block") {
            document.getElementById("moveToSpecificPopupButton").click();
        }
    }  else if (event.key === "F4") {// 위쪽 방향키: 랜덤 페이지🌪️
        document.getElementById("randomPopupOpen").click();
    }  else if (event.key === "ArrowUp") {// 위쪽 방향키: 휘장 지우기/보이기❄️
        document.getElementById("curtainHiddenButton").click();
    }  else if (event.key === "ArrowDown") {// 아래쪽 방향기: 발음 가리기/보이기⚡
        document.getElementById("rtHiddenButton").click();
    }  else if (event.key === "Escape") {// Esc: 열린 팝업 닫기🔥
        const goToPopup = document.getElementById("goToPopup");
        
        if (goToPopup && goToPopup.style.display === "block") {
            document.getElementById("closeGoToPopupButton").click();
        } else {
            document.getElementById("closePopupButton").click();
        }
    }
    //메인 버튼 제어
    else if (event.shiftKey && event.code.startsWith("Digit")) { // shiftKey + Number: 메인 팝업 열기⚔️
        const num = event.code.replace("Digit", "");

        if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(num)) {
            window[`title${num}Open`]();
        }
    }
});

// 한자 음 별색
document.querySelectorAll('.particularText').forEach(elem => {
  const lines = elem.innerHTML.split('<br>');
  const newLines = lines.map(line => {
    line = line.trim();
    if (line.includes('/')) {
      const slashIndex = line.indexOf('/');
      // 슬래시 앞글자, 슬래시 뒤글자
      const beforeChar = line.charAt(slashIndex - 1);
      const afterChar = line.charAt(slashIndex + 1);

      // 슬래시 앞글자와 뒤글자를 제외한 나머지 텍스트 분리
      const beforeText = line.slice(0, slashIndex - 1);
      const afterText = line.slice(slashIndex + 2);

      // 조합: beforeText + 강조된 앞글자 + '/' + 강조된 뒷글자 + afterText
      return beforeText +
             `<span class="highlight">${beforeChar}</span>` +
             '/' +
             `<span class="highlight">${afterChar}</span>` +
             afterText;
    } else {
      // 슬래시 없는 줄: 마지막 글자 강조
      if (line.length === 0) return '';
      const lastChar = line.slice(-1);
      const rest = line.slice(0, -1);
      return rest + `<span class="highlight">${lastChar}</span>`;
    }
  });
  elem.innerHTML = newLines.join('<br>');
});

// 정지 버튼 클릭 시: 루프 일시 정지 + 재개
document.querySelector(".pauseLoopButton").addEventListener("click", () => {
    isPaused = !isPaused;

    if (isPaused) {
        autoLoopEnabled = false;
        clearTimeout(autoLoopTimeout);
    } else {
        autoLoopEnabled = true;

        function runAutoLoop() {
            if (!autoLoopEnabled) return;

            document.querySelector("#curtainUpDownButton").click();

            setTimeout(() => {
                document.querySelector("#nextPopupButton").click();
                autoLoopTimeout = setTimeout(runAutoLoop, autoLoopDelaySec * 1000);
            }, 1000);
        }
        runAutoLoop();
    }
});

// 중지 버튼 클릭 시: 루프 완전 정지 + 버튼 숨김
document.querySelector(".stopLoopButton").addEventListener("click", () => {
    autoLoopEnabled = false;
    clearTimeout(autoLoopTimeout);

    // 버튼 숨김 처리
    document.querySelector(".pauseLoopButton").style.display = "none";
    document.querySelector(".stopLoopButton").style.display = "none";
});

/*
 * 모체 통합 패치 (index.html + Study.js)
 * 기능: TXT 업로드 → 현재 그룹에 카드 생성, 즐겨찾기(⭐) 토글/집계(title99)
 * 대상: Study.js에 붙여넣기 (하단 또는 유틸 직후), index.html에 버튼 2개 추가
 *
 * ──────────────────────────────────────────────────────────────
 * 1) index.html 수정 (버튼 2곳)
 *   A. 헤더에 업로드 버튼 추가 (📂)
 *      <button class="headerButtonStyle" id="txtUpload" onclick="txtUpload()">📂</button>
 *      ※ 위치: #rtHiddenButton 다음, #closePopupButton 이전
 *   B. 메인에 즐겨찾기 버튼 추가
 *      <button class="mainButtonStyle" id="titleOpenBookmark" onclick="titleBookmarkOpen()">⚔️<br>즐겨찾기<br>.</button>
 *      ※ 위치: 메인 버튼 그리드 중 적당한 자리에 1개 추가
 *
 * 2) Study.js 추가 코드 (본 파일 이하 붙여넣기)
 */

// ──────────────────────────────────────────────────────────────
// LocalStorage 키/좌표 유틸
function storageKeyForX(x) { return `popups_title${x}`; }
function getLastYForX(x) { try { return parseInt(localStorage.getItem(`last_view_title${x}`) || "", 10) || null; } catch (e) { return null; } }
function setLastYForX(x, y) { try { localStorage.setItem(`last_view_title${x}`, String(y)); } catch (e) { } }

// ──────────────────────────────────────────────────────────────
// 동적 팝업 생성 (titleX-Y) — 즐겨찾기 집계(title99)나 업로드 시 사용
function createPopupNode(x, y, ko, han) {
    const id = `title${x}-${y}`;
    if (document.getElementById(id)) return document.getElementById(id);
    const wrap = document.createElement('div');
    wrap.className = 'popup';
    wrap.id = id;
    wrap.style.display = 'none';
    wrap.innerHTML = `
    <div class="top"><div class="inner">
      <button class="FavoriteButton" id="FavoriteButton${x}-${y}">⭐</button>
      <h6 class="mainText"></h6>
      <p class="HanjaText">${han || ''}</p>
      <h6 class="hidetext">.</h6>
    </div></div>
    <div class="bottom"><div class="inner">
      <h1 class="particularText">${ko || ''}</h1>
    </div></div>`;
    const container = document.getElementById('popupContainer') || document.body;
    container.appendChild(wrap);
    // ⭐ 리스너 + 저장 상태 복원
    const favBtn = wrap.querySelector(`#FavoriteButton${x}-${y}`);
    if (favBtn) {
        favBtn.addEventListener('click', () => toggleFavorite(x, y, favBtn));
        try {
            const arr = JSON.parse(localStorage.getItem(storageKeyForX(x))) || [];
            const rec = arr.find(r => r && r.y === y);
            if (rec && rec.fav) favBtn.classList.add('active');
        } catch (e) { }
    }
    return wrap;
}

// ──────────────────────────────────────────────────────────────
// 정적(하드코딩) 팝업들에 ⭐ 단추 주입
function injectFavoriteButtons() {
    document.querySelectorAll('.popup').forEach(p => {
        const id = p.id; // titleX-Y
        const m = id && id.match(/title(\d+)-(\d+)/);
        if (!m) return;
        const x = parseInt(m[1], 10), y = parseInt(m[2], 10);
        // 이미 있으면 스킵
        if (p.querySelector(`#FavoriteButton${x}-${y}`)) return;
        const host = p.querySelector('.top .inner');
        if (!host) return;
        const btn = document.createElement('button');
        btn.className = 'FavoriteButton';
        btn.id = `FavoriteButton${x}-${y}`;
        btn.textContent = '⭐';
        btn.style.marginRight = '6px';
        host.prepend(btn);
        btn.addEventListener('click', () => toggleFavorite(x, y, btn));
        // 상태 복원
        try {
            const arr = JSON.parse(localStorage.getItem(storageKeyForX(x))) || [];
            const rec = arr.find(r => r && r.y === y);
            if (rec && rec.fav) btn.classList.add('active');
        } catch (e) { }
    });
}

// ──────────────────────────────────────────────────────────────
// 즐겨찾기 토글/저장 (정적/동적 공통)
function toggleFavorite(x, y, btnEl) {
    const key = storageKeyForX(x);
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(key)) || []; } catch (e) { arr = []; }
    const node = document.getElementById(`title${x}-${y}`);
    const koText = node?.querySelector('.particularText')?.textContent?.trim() || '';
    const hanHtml = node?.querySelector('.HanjaText')?.innerHTML?.trim() || '';
    const now = Date.now();
    const idx = arr.findIndex(r => r && r.y === y);
    let nextFav = true;
    if (idx >= 0) {
        const rec = arr[idx] || {};
        nextFav = !rec.fav;
        arr[idx] = { y, ko: rec.ko || koText, han: rec.han || hanHtml, fav: nextFav, favAt: nextFav ? (rec.favAt || now) : undefined };
    } else {
        arr.push({ y, ko: koText, han: hanHtml, fav: true, favAt: now });
        nextFav = true;
    }
    arr.sort((a, b) => (a?.y || 0) - (b?.y || 0));
    localStorage.setItem(key, JSON.stringify(arr));
    if (btnEl) btnEl.classList.toggle('active', nextFav);
    window.dispatchEvent(new CustomEvent('favorites:changed'));
}

// ──────────────────────────────────────────────────────────────
// 즐겨찾기 집계(title99) 생성 + 원본 점프 표시
function buildFavoritesTitle99(sort = 'recent') {
    try { localStorage.removeItem(storageKeyForX(99)); } catch (e) { }
    document.querySelectorAll('.popup[id^="title99-"]').forEach(n => n.remove());

    const collected = [];
    for (let x = 1; x <= 200; x++) {
        if (x === 99) continue;
        let arr = []; try { arr = JSON.parse(localStorage.getItem(storageKeyForX(x))) || []; } catch (e) { arr = []; }
        arr.forEach(rec => { if (rec && rec.fav) { collected.push({ srcX: x, srcY: rec.y, ko: rec.ko || '', han: rec.han || '', fav: true, favAt: rec.favAt || 0 }); } });
    }
    if (!collected.length) return 0;
    if (sort === 'recent') collected.sort((a, b) => (b.favAt || 0) - (a.favAt || 0));
    else if (sort === 'source') collected.sort((a, b) => (a.srcX - b.srcX) || (a.srcY - b.srcY));

    const out = collected.map((it, i) => ({ y: i + 1, ko: it.ko, han: it.han, fav: true, srcX: it.srcX, srcY: it.srcY }));
    localStorage.setItem(storageKeyForX(99), JSON.stringify(out));

    out.forEach(it => {
        const node = createPopupNode(99, it.y, it.ko, it.han);
        // 즐겨찾기 화면의 ⭐ → 원본 토글로 전환
        const favBtn = node?.querySelector(`#FavoriteButton99-${it.y}`);
        if (favBtn) {
            const clone = favBtn.cloneNode(true);
            clone.classList.add('active');
            favBtn.replaceWith(clone);
            clone.addEventListener('click', (ev) => {
                ev.stopPropagation(); ev.preventDefault();
                toggleFavorite(it.srcX, it.srcY, null);
                window.dispatchEvent(new CustomEvent('favorites:changed'));
            });
        }
        const tag = node?.querySelector('.mainText');
        if (tag) {
            tag.textContent = `(title${it.srcX}-${it.srcY})`;
            tag.style.cursor = 'pointer';
            tag.title = '원본으로 이동';
            tag.addEventListener('click', () => { setLastYForX(it.srcX, it.srcY); openPopup(it.srcX); });
        }
    });
    if (typeof updateGoToPopupButtonLabel === 'function') updateGoToPopupButtonLabel();
    return out.length;
}

function titleBookmarkOpen() {
    const count = buildFavoritesTitle99('recent');
    if (!count) { showToast('북마크가 없습니다.', 1600); return; }
    setLastYForX(99, 1);
    openPopup(99);
}

// ──────────────────────────────────────────────────────────────
// TXT 업로드 (각 줄: "뜻;漢字")
function txtUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain';
    input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (!lines.length) { showToast('유효한 줄이 없습니다.', 1500); return; }

        // 현재 열린 X 찾기 → 없으면 2로 기본(배정한자)
        const current = document.querySelector('.popup[style*="display: block"]');
        let x = 2;
        if (current) { const m = current.id.match(/title(\d+)-(\d+)/); if (m) x = parseInt(m[1], 10) || 2; }

        // 기존 배열 로드 → 다음 y부터 채우기
        let arr = []; try { arr = JSON.parse(localStorage.getItem(storageKeyForX(x))) || []; } catch (e) { arr = []; }
        let nextY = arr.reduce((max, r) => Math.max(max, r?.y || 0), 0) + 1;

        const created = [];
        for (const line of lines) {
            const [koRaw, hanRaw] = line.split(';');
            const ko = (koRaw || '').trim();
            const han = (hanRaw || '').trim();
            if (!ko && !han) continue;
            arr.push({ y: nextY, ko, han, fav: false });
            createPopupNode(x, nextY, ko, han);
            created.push(nextY);
            nextY++;
        }
        localStorage.setItem(storageKeyForX(x), JSON.stringify(arr));

        if (created.length) {
            setLastYForX(x, created[0]);
            openPopup(x);
            showToast(`${created.length}개 추가됨 (title${x})`, 1600);
        } else {
            showToast('추가된 항목이 없습니다.', 1500);
        }
    };
    input.click();
}

// ──────────────────────────────────────────────────────────────
// 즐겨찾기 화면 열려있을 때 실시간 갱신 + 빈 경우 새로고침
window.addEventListener('favorites:changed', () => {
    const current = document.querySelector('.popup[style*="display: block"]');
    if (!current) return;
    const m = current.id.match(/title(\d+)-(\d+)/);
    if (!m) return;
    const x = parseInt(m[1], 10), y = parseInt(m[2], 10);
    if (x !== 99) return;
    const count = buildFavoritesTitle99('recent');
    if (!count) { window.location.reload(); return; }
    const targetY = Math.min(y, count);
    setLastYForX(99, targetY); openPopup(99);
});

// ──────────────────────────────────────────────────────────────
// 경량 토스트
function ensureToastHost() {
    let host = document.getElementById('appToastHost');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'appToastHost';
    Object.assign(host.style, { position: 'fixed', left: '50%', bottom: '8vh', transform: 'translateX(-50%)', zIndex: '10050', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' });
    document.body.appendChild(host);
    return host;
}
function showToast(message, duration = 1500) {
    const host = ensureToastHost();
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, { maxWidth: '86vw', padding: '10px 14px', borderRadius: '10px', background: 'rgba(30,30,30,0.92)', color: '#f4f4f4', boxShadow: '0 6px 20px rgba(0,0,0,0.25)', fontSize: '14px', letterSpacing: '0.2px', lineHeight: '1.2', opacity: '0', transform: 'translateY(10px)', transition: 'opacity .18s ease, transform .18s ease', pointerEvents: 'auto' });
    host.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; setTimeout(() => toast.remove(), 220); }, Math.max(800, duration));
}

// ──────────────────────────────────────────────────────────────
// 초기화: 정적 팝업에 ⭐ 주입 + 스토리지 복원(있다면) + 라벨 갱신
(function initFavoritesAndUpload() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { injectFavoriteButtons(); restorePopupsFromStorage(); if (typeof updateGoToPopupButtonLabel === 'function') updateGoToPopupButtonLabel(); });
    } else {
        injectFavoriteButtons(); restorePopupsFromStorage(); if (typeof updateGoToPopupButtonLabel === 'function') updateGoToPopupButtonLabel();
    }
})();

// ──────────────────────────────────────────────────────────────
// 로컬 스토리지에 있는 동적 팝업 복원
function restorePopupsFromStorage() {
    for (let x = 1; x <= 200; x++) {
        const key = storageKeyForX(x);
        let arr = []; try { arr = JSON.parse(localStorage.getItem(key)) || []; } catch (e) { arr = []; }
        if (!arr.length) continue;
        arr.forEach(rec => createPopupNode(x, rec.y, rec.ko, rec.han));
    }
    if (typeof updateGoToPopupButtonLabel === 'function') updateGoToPopupButtonLabel();
}

function resetLocalPopups() {
    if (!confirm('정말 초기화하시겠습니까? 입력한 모든 내용이 삭제됩니다.')) return;

    // 1) localStorage에서 본 앱의 팝업 데이터 제거 (키: popups_titleX)
    try {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('popups_title')) localStorage.removeItem(k);
        });
    } catch (e) {
        console.error('스토리지 초기화 중 오류:', e);
    }

    // 2) 동적으로 생성된 팝업 DOM 제거 (#popupContainer 하위만 비움)
    //    #popupContainer는 이미 문서에 존재합니다.
    const container = document.getElementById('popupContainer');
    if (container) container.innerHTML = '';

    // 3) 헤더 라벨 갱신 (열린 팝업이 없으면 "🌊"으로 돌아감)
    if (typeof updateGoToPopupButtonLabel === 'function') {
        updateGoToPopupButtonLabel(); // 기존 파일에 이미 정의되어 있음
    }

    alert('시스템 입력 초기화.');
    setTimeout(() => window.location.reload(), 50)
}

// JSON으로 titleX 그룹을 한 번만 동적 생성하옵니다
async function loadTitleFromJson(x, jsonPath) {
    // 이미 만들어졌으면 재생성 생략하옵니다
    if (document.querySelector(`.popup[id^="title${x}-"]`)) return;

    let data;
    try {
        const res = await fetch(jsonPath);
        data = await res.json();
    } catch (e) {
        console.error(e);
        alert('자료를 불러오지 못하였사옵니다');
        return;
    }
    if (!Array.isArray(data)) return;

    // JSON 순서대로 y=1부터 연속 넘버링하여 팝업 생성하옵니다
    data.forEach((item, idx) => {
        const y = idx + 1;
        const ko = [item?.meaning, item?.sound].filter(Boolean).join('\n'); // 뜻 + 음을 아래칸에 표기하옵니다
        const han = item?.hanja || '';                                       // 한자를 위칸에 표기하옵니다
        const node = createPopupNode(x, y, ko, han);
        const head = node?.querySelector('.mainText');
        if (head) head.textContent = item?.header || '';
    });

    if (typeof updateGoToPopupButtonLabel === 'function') updateGoToPopupButtonLabel();
}

// 5번 버튼 동작: 필요 시 JSON 로드 → 5-1 바로 열기 하옵니다
async function title5Open() {
    await loadTitleFromJson(5, 'title-5.json');
    setLastYForX?.(5, 1);
    openPopup(5);
}