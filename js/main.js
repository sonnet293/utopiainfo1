(() => {
    const SECTIONS = ['notice', 'world', 'system', 'combat'];
    const BGM_VOLUME = 0.6;
    const STAGGER_MS = 90;

    const body = document.body;
    const intro = document.getElementById('intro-overlay');
    const bgm = document.getElementById('bgm');
    const pageBar = document.querySelector('.page-bar');
    const progress = document.querySelector('.scroll-progress span');
    const views = [...document.querySelectorAll('.view')];
    const soundButtons = document.querySelectorAll('[data-sound]');
    const tabs = document.querySelectorAll('.page-tabs [data-section]');

    let entered = false;
    let observer = null;
    let activeView = null;

    /* ---------- BGM ---------- */
    function fadeInBgm() {
        const start = performance.now();
        const step = (now) => {
            // 첫 프레임의 now는 start보다 살짝 이를 수 있어 0 미만이 되지 않게 제한
            const t = Math.max(0, Math.min((now - start) / 1500, 1));
            bgm.volume = BGM_VOLUME * t;
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    function playBgm() {
        bgm.play().catch(updateSoundButtons);
    }

    function updateSoundButtons() {
        const on = !bgm.paused && !bgm.muted;
        soundButtons.forEach((button) => {
            button.textContent = on ? 'SOUND ON' : 'SOUND OFF';
            button.setAttribute('aria-pressed', String(on));
        });
    }

    function toggleSound() {
        if (bgm.paused || bgm.muted) {
            bgm.muted = false;
            playBgm();
        } else {
            bgm.muted = true;
        }
    }

    ['play', 'pause', 'volumechange'].forEach((type) => bgm.addEventListener(type, updateSoundButtons));

    // 앱 전환이나 탭 이동 시에는 음악을 멈췄다가, 돌아오면 다시 재생
    let resumeOnReturn = false;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            resumeOnReturn = !bgm.paused;
            bgm.pause();
        } else if (resumeOnReturn) {
            playBgm();
        }
    });

    /* ---------- 스크롤 등장 ---------- */
    function watchReveals(view) {
        if (observer) observer.disconnect();

        const items = view.querySelectorAll('.reveal');
        items.forEach((item) => {
            item.classList.remove('is-in');
            item.style.removeProperty('--delay');
        });

        observer = new IntersectionObserver((entries) => {
            entries
                .filter((entry) => entry.isIntersecting)
                .forEach((entry, index) => {
                    // 한 번에 보이는 요소끼리 순서대로 시차를 두고 등장
                    entry.target.style.setProperty('--delay', `${index * STAGGER_MS}ms`);
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                });
        }, {
            // 메인은 스크롤 없이 메뉴가 전부 보여야 하므로 하단 여백을 두지 않음
            rootMargin: view.id === 'view-main' ? '0px' : '0px 0px -10% 0px',
            threshold: 0.05,
        });

        // 숨김 해제 직후의 레이아웃이 반영된 뒤에 관찰 시작
        requestAnimationFrame(() => items.forEach((item) => observer.observe(item)));
    }

    function updateProgress() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
        progress.style.setProperty('--progress', ratio);
    }

    /* ---------- 페이지 전환 ---------- */
    function currentSection() {
        return SECTIONS.indexOf(location.hash.slice(1));
    }

    function render({ focus = true } = {}) {
        const section = currentSection();
        const target = document.getElementById(section < 0 ? 'view-main' : `view-section-${section}`);

        // 해시 이동 시 hashchange와 popstate가 함께 발생하므로 중복 렌더링 방지
        if (target === activeView) return;
        activeView = target;

        views.forEach((view) => { view.hidden = view !== target; });
        pageBar.hidden = section < 0;
        tabs.forEach((tab) => {
            if (Number(tab.dataset.section) === section) tab.setAttribute('aria-current', 'page');
            else tab.removeAttribute('aria-current');
        });

        window.scrollTo(0, 0);
        watchReveals(target);
        updateProgress();

        const heading = target.querySelector('h2');
        if (focus && heading) heading.focus({ preventScroll: true });
    }

    function go(hash) {
        if (location.hash.slice(1) === hash) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (hash) {
            location.hash = hash;
        } else {
            // 메인으로 돌아갈 때 주소 끝에 #이 남지 않게 처리
            history.pushState(null, '', location.pathname + location.search);
            render();
        }
    }

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-section], [data-home], [data-sound]');
        if (!button) return;

        if ('sound' in button.dataset) toggleSound();
        else if ('home' in button.dataset) go('');
        else go(SECTIONS[Number(button.dataset.section)]);
    });

    window.addEventListener('hashchange', () => { if (entered) render(); });
    window.addEventListener('popstate', () => { if (entered) render(); });
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    /* ---------- 인트로 ---------- */
    function enter() {
        if (entered) return;
        entered = true;

        // 브라우저 자동재생 정책 때문에 터치 이벤트 안에서 바로 재생해야 함
        bgm.volume = 0;
        playBgm();
        fadeInBgm();

        intro.classList.add('is-leaving');
        body.classList.remove('is-locked');

        setTimeout(() => render({ focus: false }), 400);
        setTimeout(() => { intro.hidden = true; }, 1000);
    }

    intro.addEventListener('click', enter);
    intro.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            enter();
        }
    });

    updateSoundButtons();
})();
