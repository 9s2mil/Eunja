// title.js
// JSON 데이터로 팝업 자동 생성 (깨진 JSON도 보정 로드)

async function renderPopupFromJSON(jsonUrl, containerSelector) {
    const $container = document.querySelector(containerSelector);
    if (!$container) return;

    let items = [];
    try {
        const res = await fetch(jsonUrl);

        // 1차: 정상 JSON 시도
        try {
            items = await res.json();
        } catch {
            // 2차: 텍스트 받아서 보정 후 파싱
            let text = await res.text();

            // BOM 제거
            text = text.replace(/\uFEFF/g, '');

            // 잘못된 index 라인 제거: "index": ,  (값 비어있음)
            text = text.replace(/^\s*"index"\s*:\s*,\s*$\n?/gmi, '');

            // 객체 사이 콤마 없으면 추가: }{ -> },{
            text = text.replace(/}\s*{\s*/g, '},\n{');

            // 배열 대괄호가 없으면 감싸기
            if (!/^\s*\[/.test(text)) text = `[${text}]`;

            // 맨 앞/뒤의 불필요한 콤마 정리
            text = text.replace(/^\s*\[,\s*/, '[').replace(/,\s*\]\s*$/, ']');

            items = JSON.parse(text);
            console.warn('title-1.json 형식을 보정하여 로드했습니다.');
        }
    } catch (e) {
        console.error('JSON 로드 실패:', e);
        return;
    }

    // 출력 비우고 다시 그림
    $container.innerHTML = '';

    for (const obj of items) {
        const id = obj.id || '';
        const header = obj.header || '';
        const hanja = obj.hanja || '';
        const meaning = obj.meaning || '';
        const sound = obj.sound || '';
        const notes = (obj.notes == null ? '' : String(obj.notes));

        // 상단
        const topInner = document.createElement('div');
        topInner.className = 'inner';

        const h6Header = document.createElement('h6');
        h6Header.className = 'mainText';
        // \n 또는 <br> 모두 허용
        h6Header.innerHTML = String(header).replace(/<br\s*\/?>/gi, '\n').replace(/\n/g, '<br>');

        const h1Hanja = document.createElement('h1');
        h1Hanja.className = 'titlecolor';
        h1Hanja.textContent = hanja;

        const h6Dot = document.createElement('h6');
        h6Dot.textContent = notes === '' ? '.' : notes;

        topInner.append(h6Header, h1Hanja, h6Dot);

        const top = document.createElement('div');
        top.className = 'top';
        top.appendChild(topInner);

        // 하단
        const bottomInner = document.createElement('div');
        bottomInner.className = 'inner';

        const h1Center = document.createElement('h1');
        h1Center.className = 'particularText';
        h1Center.innerHTML = String(sound ? (meaning + ' ' + sound) : meaning)
            .replace(/<br\s*\/?>/gi, '\n').replace(/\n/g, '<br>');

        bottomInner.appendChild(h1Center);

        const bottom = document.createElement('div');
        bottom.className = 'bottom';
        bottom.appendChild(bottomInner);

        // 팝업
        const popup = document.createElement('div');
        popup.className = 'popup';
        if (id) popup.id = id;
        popup.append(top, bottom);

        $container.append(popup, document.createElement('br'));

        document.querySelector(containerSelector)?.dispatchEvent(new CustomEvent('popups-rendered'));
    }
}