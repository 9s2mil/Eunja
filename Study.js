let randomMode = false;
let randomSequence = [];
let randomIndex = 0;
let randomPlayInterval = null;
let autoLoopEnabled = false;
let autoLoopDelaySec = null;
let autoLoopTimeout = null;
let isPaused = false;
let pendingUpload = null;

//태그 변환로직
(() => {
    // 이스케이프용 자리표시자
    const ESC = { '$': '\uE000', '#': '\uE001', '%': '\uE002' };

    const CLASS_MAP = {
        mid: 'mid',
        nano: 'nano',
        mini: 'mini',
        main: 'mainText',
    };

    function escapePlaceholders(s) {
        return s
            .replace(/\\\$/g, ESC['$'])
            .replace(/\\#/g, ESC['#'])
            .replace(/\\%/g, ESC['%']);
    }
    function unescapePlaceholders(s) {
        return s
            .replace(/\uE000/g, '$')
            .replace(/\uE001/g, '#')
            .replace(/\uE002/g, '%');
    }
    function escRe(ch) { return ch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); }

    // 간단형 한 쌍 치환: $…$, #…#, %…%  (중첩 금지, 다회 허용)
    function replacePair(text, ch, cls) {
        const re = new RegExp(escRe(ch) + '([^' + escRe(ch) + ']+?)' + escRe(ch), 'g');
        return text.replace(re, (_, inner) => `<span class="${cls}">${inner}</span>`);
    }

    function expandShorthandString(s) {
        if (!s || typeof s !== 'string') return s;

        let out = escapePlaceholders(s);

        out = out.replace(/\$\(([a-zA-Z][\w-]*)\)\{([\s\S]*?)\}/g, (m, id, content) => {
            const cls = CLASS_MAP[id] || null;
            if (!cls) return m; 
            return `<span class="${cls}">${content}</span>`;
        });

        // 루비: @(본문|후리가나)
        out = out.replace(/@\(([^|)]+)\|([^)]+)\)/g, (m, rb, rt) => {
            return `<ruby>${rb}<rt>${rt}</rt></ruby>`;
        });

        // 간단형 3종
        out = replacePair(out, '$', 'mid');       // $…$  → <span class="mid">
        out = replacePair(out, '#', 'main');  // #…#  → <span class="nano">
        out = replacePair(out, '%', 'mini');  // %…%  → <span class="minitext">

        return unescapePlaceholders(out);
    }

    // 하드코딩된 팝업 DOM 내부 텍스트 노드 처리 (열 때 1회)
    function processShorthandInElement(root) {
        if (!root || (root.dataset && root.dataset.shorthandProcessed === '1')) return;

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    return /(\$|#|%|@\()/.test(node.nodeValue)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_REJECT;
                }
            }
        );

        const targets = [];
        while (walker.nextNode()) targets.push(walker.currentNode);

        for (const textNode of targets) {
            const html = expandShorthandString(textNode.nodeValue);
            if (html !== textNode.nodeValue) {
                const span = document.createElement('span');
                span.innerHTML = html;
                textNode.parentNode.replaceChild(span, textNode);
            }
        }

        const htmlBefore = root.innerHTML;
        if (/[#$%]|@\(/.test(htmlBefore)) {
            const htmlAfter = window.__expandShorthandString(htmlBefore);
            if (htmlAfter !== htmlBefore) {
                root.innerHTML = htmlAfter;
            }
        }
        
        if (root.dataset) root.dataset.shorthandProcessed = '1';
    }

    window.__expandShorthandString = expandShorthandString;
    window.__processShorthandInElement = processShorthandInElement;

    window.__processShorthandByGroup = function (x) {
        document
            .querySelectorAll(`.popup[id^="title${x}-"]`)
            .forEach(el => window.__processShorthandInElement(el));
    };
})();

//⚔️메인 주제열기
function openPopup(num) {
    applyPendingUploadIfAny(num);
    const curtain = document.querySelector('.curtain');
    const first = document.getElementById(`title${num}-1`);
    if (!first) { showToast(`입력된 데이터가 없습니다.`); return; } 
    first.style.display = "block";
    __processShorthandByGroup(num);
    __processShorthandInElement(first);
    if (curtain) curtain.style.display = "block";
    updateGoToPopupButtonLabel();
}

function title1Open() { openPopup(1); }
function title2Open() { openPopup(2); }
function title3Open() { openPopup(3); }
function title4Open() { openPopup(4); }
async function title5Open() { await renderPopupFromJSON('title-5.json', '#popupContainer'); openPopup(5); }
function title6Open() { openPopup(6); }
function title7Open() { openPopup(7); }
function title8Open() { openPopup(8); }
function title9Open() { openPopup(9); }
function title10Open() { openPopup(10); }
function title11Open() { openPopup(11); } 
function title12Open() { openPopup(12); }

//헤더 버튼
//🌊🌪️❄️⚡📂🔥
//🌊페이지 이동 팝업열기
function goToPopup() {
    const popup = document.getElementById("goToPopup");
    popup.style.display = "block";
    
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

    // 🔹 정수를 입력하지 않았으면 → 현재 x 그룹의 1페이지(title{x}-1)로 이동
    if (valueRaw === "") {
        const firstPopup = document.getElementById(`title${x}-1`);
        if (firstPopup && currentPopup !== firstPopup) {
            currentPopup.style.display = "none";
            firstPopup.style.display = "block";
            __processShorthandInElement(firstPopup);

            updateGoToPopupButtonLabel();
            closeGoToPopup();
            input.value = "";

            triggerGoldFlash(firstPopup);
        } else {
            // (선택) 이미 1페이지인 경우 사용자 안내
            showToast?.('이미 1페이지입니다.');
            closeGoToPopup();
            input.value = "";
        }
        return;
    }

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
            __processShorthandInElement(newPopup);

            updateGoToPopupButtonLabel();
            closeGoToPopup();
            input.value = "";

            triggerGoldFlash(newPopup);
        }
    }

}
/* ====== 이동팝업 내 검색 상태 ====== */
window.__popupSearch = { x: null, query: "", hits: [], idx: -1 };

/* 공백/대소문자 정규화 (NBSP 포함) */
function _norm(s) {
    return (s || "")
        .toLowerCase()
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* 현재 '콘텐츠 팝업'만 선택 (goToPopup/검색내비 팝업 제외) */
function _currentContentPopup() {
    return document.querySelector('.popup[id^="title"][style*="display: block"]');
}

/* 현재 그룹 X(titleX-?) 추출 */
function _currentGroupX() {
    const cur = _currentContentPopup();
    if (!cur) return null;
    const m = cur.id.match(/title(\d+)-/);
    return m ? m[1] : null;
}

/* 묶음 X의 모든 콘텐츠 팝업 */
function _listGroupPopups(x) {
    return [...document.querySelectorAll(`.popup[id^="title${x}-"]`)];
}

/* 특정 콘텐츠 팝업 보여주기 */
function _showContentPopup(el) {
    const cur = _currentContentPopup();
    if (cur && cur !== el) cur.style.display = "none";
    el.style.display = "block";
    window.__processShorthandInElement?.(el);
    updateGoToPopupButtonLabel?.();
    window.triggerGoldFlash?.(el);
}

/* 이동팝업 닫기 & 검색 UI 비우기 */
function _clearGoToSearchUI() {
    const input = document.getElementById("popupSearchInput");
    const info = document.getElementById("popupSearchInfo");
    if (input) input.value = "";
    if (info) info.textContent = "";
}
function _closeGoToPopupSmart() {
    if (typeof closeGoToPopup === "function") { closeGoToPopup(); return; }
    const host = document.getElementById("goToPopup") || document.getElementById("popupSearchInput")?.closest(".popup");
    if (host) host.style.display = "none";
}

/* 검색 내비 팝업 표시/닫기/정보 */
function __ensureSearchNavPopup() {
    let el = document.getElementById("searchNavPopup");
    if (!el) {
        el = document.createElement("div");
        el.id = "searchNavPopup";
        el.className = "goToPopup";
        el.style.display = "none";
        el.style.zIndex = "1003";
        el.innerHTML = `
      <div class="popupContent" style="max-width:420px;">
        <div class="popupHeader">검색 결과 이동</div>
        <div id="searchNavInfo" style="margin:8px 0 12px; font-size:13px; opacity:.9;"></div>
        <div class="equalityButton" style="gap:8px;">
          <button onclick="prevPopupSearch()">이전</button>
          <button onclick="nextPopupSearch()">다음</button>
          <button onclick="closeSearchNavPopup()">닫기</button>
        </div>
      </div>`;
        document.body.appendChild(el);
    }
    return el;
}
function openSearchNavPopupIfNeeded() {
    const S = window.__popupSearch;
    const el = __ensureSearchNavPopup();
    const show = (S.hits.length > 1);

    if (show) {
        // ① 혹시 다른 컨테이너 영향 받으면 본문 최하단으로 이동
        if (el.parentElement !== document.body) document.body.appendChild(el);

        // ② 클래스와 z-index 정규화
        el.className = "goToPopup";
        el.style.zIndex = "1003";

        // ③ 확실히 보이게 강제(important로 덮어쓰기)
        el.style.removeProperty("display");
        el.style.setProperty("display", "block", "important");
        el.style.setProperty("visibility", "visible", "important");
        el.style.setProperty("opacity", "1", "important");
        el.style.setProperty("pointer-events", "auto", "important");

        // ④ 혹시 width가 0이면 최소 폭 보장
        el.style.setProperty("minWidth", "320px");
        el.style.setProperty("width", "min(90vw, 600px)");

        // ⑤ 레이아웃 강제 계산 후 상태 로그
        void el.offsetWidth; // reflow
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        console.log("[SearchNavPopup:after]", {
            displayInline: el.style.display || "(none)",
            displayComputed: cs.display,
            zComputed: cs.zIndex,
            rect
        });
    } else {
        el.style.display = "none";
    }

    _updateSearchNavInfo();
}


function closeSearchNavPopup() {
    const el = document.getElementById("searchNavPopup");
    if (el) el.style.display = "none";
}
function _updateSearchNavInfo() {
    const S = window.__popupSearch;
    const info = document.getElementById("searchNavInfo");
    if (info && S.hits.length) info.textContent = `${S.idx + 1} / ${S.hits.length} · “${S.query}”`;
}

/* ====== 이동팝업 '확인' 버튼: 검색 실행 ====== */
function startPopupSearch() {
    const qRaw = document.getElementById("popupSearchInput")?.value || "";
    const q = _norm(qRaw);
    if (!q) { window.showToast?.("검색어를 입력하옵소서."); return; }

    const x = _currentGroupX();
    if (!x) { window.showToast?.("먼저 아무 팝업이나 여시옵소서."); return; }

    const list = _listGroupPopups(x);
    const hits = list.filter(el => _norm(el.textContent).includes(q));

    if (!hits.length) {
        const info = document.getElementById("popupSearchInfo");
        if (info) info.textContent = "결과 없음";
        closeSearchNavPopup(); // 실패 시 내비 팝업 숨김
        return;
    }

    // 상태 저장
    window.__popupSearch = { x, query: q, hits, idx: 0 };

    // 첫 결과로 이동
    _showContentPopup(hits[0]);

    // ② 검색 성공: 이동팝업 닫기
    _closeGoToPopupSmart();

    // ③ 컨테이너 비우기
    _clearGoToSearchUI();

    // ① 결과가 2개 이상일 때만 내비 팝업 표시
    openSearchNavPopupIfNeeded();
}

/* 내비 팝업: 이전/다음 */
function nextPopupSearch() {
    const S = window.__popupSearch;
    if (!S.hits.length) return;
    S.idx = (S.idx + 1) % S.hits.length;
    _showContentPopup(S.hits[S.idx]);
    _updateSearchNavInfo();
}
function prevPopupSearch() {
    const S = window.__popupSearch;
    if (!S.hits.length) return;
    S.idx = (S.idx - 1 + S.hits.length) % S.hits.length;
    _showContentPopup(S.hits[S.idx]);
    _updateSearchNavInfo();
}

/* 품질: 엔터키로도 검색되게 (선택) */
document.addEventListener("keydown", e => {
    if (e.key === "Enter" && document.getElementById("popupSearchInput") === document.activeElement) {
        startPopupSearch();
    }
});


//🌊페이지 이동 후 애니메이션
function triggerGoldFlash(element) {
    element.classList.add("gold-flash");
    setTimeout(() => {
        element.classList.remove("gold-flash");
    }, 700); 
}

//🌪️랜덤모드/정상화
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
//🌪️랜덤 셔플
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
        __processShorthandInElement(newPopup);
        updateGoToPopupButtonLabel();
        triggerGoldFlash(newPopup);
    }

    if (randomIndex >= randomSequence.length) {
        shuffle(randomSequence);
        randomIndex = 0;
        console.log("랜덤 순서 재생성:", randomSequence);
    }
}

//❄️휘장 투명화/정상화
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

//📂업로드 버튼은 후술함

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
//🗡️🛡️⚔️
//🗡️이전 팝업 열기
function prevPopup() {
    movePopup(-1);
    var curtain = document.querySelector('.curtain'); 
    curtain.style.display = "block"; 
}

//🛡️휘장 가리기/열기
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
            shuffle(randomSequence);
            randomIndex = 0;
        }

        const nextY = randomSequence[randomIndex];
        randomIndex++;

        const nextPopup = document.getElementById(`title${x}-${nextY}`);
        if (nextPopup) {
            currentPopup.style.display = "none";
            nextPopup.style.display = "block";
            __processShorthandInElement(nextPopup);
            updateGoToPopupButtonLabel();
            var curtain = document.querySelector('.curtain'); 
            curtain.style.display = "block"; 
        }
    } else {
        const nextPopup = document.getElementById(`title${x}-${currentY + 1}`);
        if (nextPopup) {
            currentPopup.style.display = "none";
            nextPopup.style.display = "block";
            __processShorthandInElement(nextPopup);
            updateGoToPopupButtonLabel();
            var curtain = document.querySelector('.curtain'); 
            curtain.style.display = "block"; 
        }
    }
}

//🗡️⚔️이전/다음 팝업 이동 함수
function movePopup(direction) {
    const currentPopup = document.querySelector(".popup[style*='display: block']");
    if (!currentPopup) return;

    const match = currentPopup.id.match(/title(\d+)-(\d+)/);
    if (!match) return;

    let x = match[1]; // 앞자리 숫자 (X)
    let y = parseInt(match[2]); // 현재 Y값

    if (randomMode) {
        let newIndex = randomIndex + direction;
        if (newIndex < 0 || newIndex >= randomSequence.length) return; 
        
        randomIndex = newIndex;
        let newPopupId = `title${x}-${randomSequence[randomIndex]}`;
        let newPopup = document.getElementById(newPopupId);

        if (newPopup) {
            currentPopup.style.display = "none";
            newPopup.style.display = "block";
            __processShorthandInElement(newPopup);
        }
    } else {
        let newPopupId = `title${x}-${y + direction}`;
        let newPopup = document.getElementById(newPopupId);

        if (newPopup) {
            currentPopup.style.display = "none";
            newPopup.style.display = "block";
            __processShorthandInElement(newPopup);
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


function storageKeyForX(x) { return `popups_title${x}`; }
function getLastYForX(x) { try { return parseInt(localStorage.getItem(`last_view_title${x}`) || "", 10) || null; } catch (e) { return null; } }
function setLastYForX(x, y) { try { localStorage.setItem(`last_view_title${x}`, String(y)); } catch (e) { } }

function parseTxtToRecords(text) {
    return text
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(line => {
            const parts = line.split(';');
            const ko = (parts[0] || '').trim();
            const han = (parts[1] || '').trim();
            return { ko, han };
        });
}

// records를 titleX-* 그룹에 이어붙이고 DOM도 생성
function addRecordsToGroup(x, records) {
    let arr;
    try { arr = JSON.parse(localStorage.getItem(storageKeyForX(x))) || []; }
    catch (e) { arr = []; }

    // 다음 y 계산
    let nextY = 1;
    if (arr.length) {
        const maxY = arr.reduce((m, r) => Math.max(m, parseInt(r?.y || 0, 10)), 0);
        nextY = maxY + 1;
    }

    // 저장 + 노드 생성
    records.forEach(rec => {
        const y = nextY++;
        arr.push({ y, ko: rec.ko, han: rec.han, fav: false });
        createPopupNode(x, y, rec.ko, rec.han); // 이미 정의됨
    });

    localStorage.setItem(storageKeyForX(x), JSON.stringify(arr));
    setLastYForX(x, 1);
    if (typeof updateGoToPopupButtonLabel === 'function') updateGoToPopupButtonLabel();
    return records.length;
}

// 업로드 대기분이 있으면 현재 X에 주입
function applyPendingUploadIfAny(x) {
    if (!pendingUpload || !pendingUpload.records?.length) return false;
    const n = addRecordsToGroup(x, pendingUpload.records);
    (window.showToast || alert)(`TXT ${n}개를 입력했습니다.`);
    pendingUpload = null;
    return true;
}

// 동적 팝업 생성 (titleX-Y) — 즐겨찾기 집계(title99)나 업로드 시 사용
function createPopupNode(x, y, ko, han) {
    const id = `title${x}-${y}`;
    if (document.getElementById(id)) return document.getElementById(id);
    const wrap = document.createElement('div');
    const _expand = s => (s || '')
        .replace(/\\\$/g, '\uE000').replace(/\\#/g, '\uE001').replace(/\\%/g, '\uE002') // 리터럴 보호
        .replace(/\$([^$]+)\$/g, '<span class="mid">$1</span>')
        .replace(/#([^#]+)#/g, '<span class="nano">$1</span>')
        .replace(/#([^&]+)#/g, '<span class="micro">$1</span>')
        .replace(/%([^%]+)%/g, '<span class="mini">$1</span>')
        .replace(/\uE000/g, '$').replace(/\uE001/g, '#').replace(/\uE002/g, '%');

    const pHan = _expand(han);
    const pKo = _expand(ko);

    wrap.className = 'popup';
    wrap.id = id;
    wrap.style.display = 'none';
    wrap.innerHTML = `
    <div class="top"><div class="inner">
      <button class="FavoriteButton" id="FavoriteButton${x}-${y}">⭐</button>
      <p class="HanjaText">${pHan || ''}</p>
    </div></div>
    <div class="bottom"><div class="inner">
      <p class="particularText">${pKo || ''}</p>
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

function txtUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain';

    input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;

        const text = await file.text();
        const records = parseTxtToRecords(text);
        if (!records.length) { (window.showToast || alert)('유효한 줄이 없습니다.'); return; }

        // ➊ 업로드 결과를 '대기' 상태로 저장
        pendingUpload = { records, name: file.name };

        // ➋ 메인 화면으로 복귀 (열린 팝업이 있다면 닫기)
        if (typeof closePopup === 'function') closePopup();

        // ➌ 안내
        (window.showToast || alert)('파일을 불러왔습니다. 메인 버튼을 눌러 넣을 위치를 선택하세요.');
    };

    input.click();
}
window.txtUpload = txtUpload;

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

(function initFavoritesAndUpload() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { injectFavoriteButtons(); restorePopupsFromStorage(); if (typeof updateGoToPopupButtonLabel === 'function') updateGoToPopupButtonLabel(); });
    } else {
        injectFavoriteButtons(); restorePopupsFromStorage(); if (typeof updateGoToPopupButtonLabel === 'function') updateGoToPopupButtonLabel();
    }
})();

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

function pickUploadTargetX(defaultX = 1) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);z-index:2000;';
    wrap.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:16px 16px 12px;min-width:260px;border:2px solid #d4af37;">
        <div style="font-weight:bold;margin-bottom:8px;text-align:center">업로드 대상 선택 (titleX)</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px;">
          ${Array.from({length:10},(_,i)=>i+1).map(n=>`<button data-x="${n}" style="padding:10px;border:2px solid #d4af37;background:#fff;cursor:pointer">${n}</button>`).join('')}
        </div>
        <div style="text-align:center">
          <button data-x="cancel" style="padding:8px 14px;border:2px solid #555;background:#555;color:#fff;cursor:pointer">기본값(${defaultX})</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    function done(val){ document.body.removeChild(wrap); resolve(val); }
    wrap.querySelectorAll('button[data-x]').forEach(b=>{
      b.addEventListener('click',()=> {
        const v = b.getAttribute('data-x');
        if (v === 'cancel') return done(defaultX);
        const n = parseInt(v,10);
        done(Number.isFinite(n)? n : defaultX);
      });
    });
  });
}