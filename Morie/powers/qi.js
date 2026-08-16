/* =========================================================
   POUVOIR : Qi partagé — Lin Shuhui & Lin Yue
   Un corps, deux régimes. Yue siphonne la nuit, Shu hérite le jour.
   ========================================================= */
(function () {

    // ---- Réglages ----
    const KILL_QI = 5;               // Dernier souffle : gain fixe
    const RESERVE_RATIO = 0.5;       // Réserve d'énergie réduite de moitié
    const SHARED_KEY = 'aequor_qi_pool';

    // ---- Pool partagé ----
    function getQi() {
        const v = parseInt(localStorage.getItem(SHARED_KEY));
        return isNaN(v) ? 0 : Math.max(0, v);
    }

    function setQi(n) {
        localStorage.setItem(SHARED_KEY, String(Math.max(0, n)));
        refreshAll();
    }

    function addQi(n) { if (n > 0) setQi(getQi() + n); }
    function spendQi(n) { if (n > 0) setQi(getQi() - n); }

    // Rafraîchit l'affichage sans casser la saisie en cours
    function refreshAll() {
        window.renderPowerPanel?.();
        document.querySelectorAll('.qi-pool-live').forEach(el => el.textContent = getQi());
        document.querySelectorAll('.qi-inject').forEach(el => {
            el.max = Math.min(window.getEsoterismeMaxDice(), getQi());
        });
    }

    // Champ Qi visible le plus proche du jet en cours
    function requestedQi() {
        const fields = [...document.querySelectorAll('.qi-inject')]
            .filter(el => el.offsetParent !== null);
        for (const el of fields) {
            const v = parseInt(el.value) || 0;
            if (v > 0) return { value: v, el };
        }
        return { value: 0, el: null };
    }

    // ---- Actions ----
    window.qiSiphon = function () {
        const requested = parseInt(document.getElementById('qi-siphon-dice')?.value) || 1;
        const out = window.resolveMagicAction({ requested, emotion: false, source: 'siphon' });
        if (!out) return;
        const gain = Math.floor(out.successes / 2);
        addQi(gain);
        window.showNotification(`Siphon : Puissance ${out.successes} donne +${gain} Qi (pool ${getQi()})`);
        window.displayPureResult?.({
            results: out.results, successes: out.successes,
            puissanceIncontrolee: out.puissanceIncontrolee,
            ruptures: out.ruptures, fractures: out.fractures,
            mjGain: out.mjGain, energyCost: out.energyCost,
            actualDice: out.dice, esotLvl: window.getEsoterismeLevel(), emotion: false
        });
    };

    // Convertit en Qi la Puissance d'un jet déjà lancé
    window.qiSiphonFromResult = function (puissance) {
        const gain = Math.floor(puissance / 2);
        addQi(gain);
        window.showNotification(`Siphon : Puissance ${puissance} donne +${gain} Qi (pool ${getQi()})`);
        const b = document.getElementById('qi-result-siphon');
        if (b) b.outerHTML = `<span class="qi-done">+${gain} Qi siphonn\u00e9</span>`;
    };

    window.qiKill = function () {
        addQi(KILL_QI);
        window.showNotification(`Dernier souffle : +${KILL_QI} Qi (pool ${getQi()})`);
        const b = document.getElementById('qi-result-kill');
        if (b) b.outerHTML = `<span class="qi-done">+${KILL_QI} Qi</span>`;
    };

    window.qiAdjust = function (d) { setQi(getQi() + d); };

    window.registerPower({
        id: 'qi',
        name: 'Qi partagé',
        defaultState: {},
        reserveMultiplier: RESERVE_RATIO,

        renderPanel(state) {
            const qi = getQi();
            const maxInject = window.getEsoterismeMaxDice();
            const isYue = (state.profile?.name || '').toLowerCase().includes('yue');
            const domain = isYue ? 'Augmentation physique' : 'Soin et buff';

            return `<div class="ctx-panel qi-panel">
                <div class="ctx-panel-title">Qi partagé</div>
                <div class="ctx-panel-body">
                    <div class="qi-pool-row">
                        <button class="qi-step" onclick="qiAdjust(-1)">−</button>
                        <div class="qi-pool-num qi-pool-live">${qi}</div>
                        <button class="qi-step" onclick="qiAdjust(1)">+</button>
                        <span class="qi-domain">${domain}</span>
                    </div>
                    <div class="qi-note">1 Qi = 1 dé magique au-delà du maximum (${maxInject}).
                        Le champ de versement se trouve dans chaque panneau de jet.</div>
                    <div class="qi-actions">
                        <div class="qi-action-row">
                            <label>Siphon</label>
                            <input type="number" id="qi-siphon-dice" value="${maxInject}" min="1" max="${maxInject}">
                            <button class="qi-btn" onclick="qiSiphon()">Siphonner</button>
                        </div>
                        <button class="qi-btn kill" onclick="qiKill()">Dernier souffle (+${KILL_QI} Qi)</button>
                    </div>
                </div>
            </div>`;
        },

        renderRollExtra(source) {
            const qi = getQi();
            const max = Math.min(window.getEsoterismeMaxDice(), qi);
            if (qi <= 0) return '';
            return `<div class="qi-inject-row">
                <label>Qi versé dans ce jet</label>
                <input type="number" class="qi-inject" value="0" min="0" max="${max}">
                <span class="qi-hint">pool <span class="qi-pool-live">${qi}</span> · max ${max}</span>
            </div>`;
        },

        renderResultActions(lastRoll) {
            const p = lastRoll?.puissance ?? 0;
            return `<div class="qi-result-actions">
                <button class="qi-btn" id="qi-result-siphon" onclick="qiSiphonFromResult(${p})">Siphonner (+${Math.floor(p / 2)} Qi)</button>
                <button class="qi-btn kill" id="qi-result-kill" onclick="qiKill()">Dernier souffle (+${KILL_QI})</button>
            </div>`;
        },

        hooks: {
            beforeRoll(ctx) {
                if (ctx.source === 'siphon') { ctx.extraDice = 0; ctx.qiUsed = 0; return; }
                const { value, el } = requestedQi();
                const usable = Math.min(value, getQi(), window.getEsoterismeMaxDice());
                ctx.extraDice = usable;
                ctx.qiUsed = usable;
                ctx.qiField = el;
            },
            afterRoll(res, ctx) {
                if (ctx.qiUsed > 0) {
                    spendQi(ctx.qiUsed);
                    if (ctx.qiField) ctx.qiField.value = 0;
                }
            }
        }
    });

})();
