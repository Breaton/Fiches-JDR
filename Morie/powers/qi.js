/* =========================================================
   POUVOIR : Qi partagé — Lin Shuhui & Lin Yue
   Un corps, deux régimes. Yue siphonne la nuit, Shu hérite le jour.
   ========================================================= */
(function () {

    // ---- Réglages ----
    const KILL_QI = 8;               // Dernier souffle : gain fixe
    const RESERVE_RATIO = 0.5;       // Réserve d'énergie réduite de moitié
    const SHARED_KEY = 'aequor_qi_pool';

    // ---- Pool partagé (localStorage + sync GitHub si dispo) ----
    function getQi() {
        const v = parseInt(localStorage.getItem(SHARED_KEY));
        return isNaN(v) ? 0 : Math.max(0, v);
    }

    function setQi(n) {
        localStorage.setItem(SHARED_KEY, String(Math.max(0, n)));
        window.renderPowerPanel?.();
    }

    function addQi(n) {
        if (n <= 0) return;
        setQi(getQi() + n);
    }

    function spendQi(n) {
        setQi(getQi() - n);
    }

    // ---- Actions propres au pouvoir ----
    window.qiSiphon = function () {
        const requested = parseInt(document.getElementById('qi-siphon-dice')?.value) || 1;
        const out = window.resolveMagicAction({ requested, emotion: false, source: 'siphon' });
        if (!out) return;
        const gain = Math.floor(out.successes / 2);
        addQi(gain);
        window.showNotification(`☯ Siphon : Puissance ${out.successes} → +${gain} Qi (pool ${getQi()})`);
        window.displayPureResult?.({
            results: out.results, successes: out.successes,
            puissanceIncontrolee: out.puissanceIncontrolee,
            ruptures: out.ruptures, fractures: out.fractures,
            mjGain: out.mjGain, energyCost: out.energyCost,
            actualDice: out.dice, esotLvl: window.getEsoterismeLevel(), emotion: false
        });
    };

    window.qiKill = function () {
        addQi(KILL_QI);
        window.showNotification(`☯ Dernier souffle : +${KILL_QI} Qi (pool ${getQi()})`);
    };

    window.qiAdjust = function (d) { setQi(getQi() + d); };

    // ---- Définition du pouvoir ----
    window.registerPower({
        id: 'qi',
        name: 'Qi partagé',

        defaultState: {},

        // Réserve d'énergie réduite : elles dépendent du Qi
        reserveMultiplier: RESERVE_RATIO,

        renderPanel(state) {
            const qi = getQi();
            const maxInject = window.getEsoterismeMaxDice();
            const domain = state.profile?.name?.toLowerCase().includes('yue')
                ? 'Augmentation physique uniquement'
                : 'Soin et buff uniquement';

            return `<div class="ctx-panel qi-panel">
                <div class="ctx-panel-title">☯ Qi partagé</div>
                <div class="ctx-panel-body">
                    <div class="qi-pool-row">
                        <button class="qi-step" onclick="qiAdjust(-1)">−</button>
                        <div class="qi-pool-num">${qi}</div>
                        <button class="qi-step" onclick="qiAdjust(1)">+</button>
                        <span class="qi-domain">${domain}</span>
                    </div>

                    <div class="qi-inject-row">
                        <label>Qi versé dans le prochain jet</label>
                        <input type="number" id="qi-inject" value="0" min="0" max="${Math.min(maxInject, qi)}"
                            oninput="renderPowerPanelSoft && renderPowerPanelSoft()">
                        <span class="qi-hint">max ${Math.min(maxInject, qi)}</span>
                    </div>
                    <div class="qi-note">1 Qi = 1 dé magique au-delà du maximum. Chaque dé coûte de l'énergie normalement.</div>

                    <div class="qi-actions">
                        <div class="qi-action-row">
                            <label>Siphon</label>
                            <input type="number" id="qi-siphon-dice" value="${maxInject}" min="1" max="${maxInject}">
                            <button class="qi-btn" onclick="qiSiphon()">☯ Siphonner</button>
                        </div>
                        <button class="qi-btn kill" onclick="qiKill()">💀 Dernier souffle (+${KILL_QI} Qi)</button>
                    </div>
                </div>
            </div>`;
        },

        hooks: {
            // Ajoute les dés de Qi avant résolution
            beforeRoll(ctx) {
                if (ctx.source === 'siphon') { ctx.extraDice = 0; return; }
                const el = document.getElementById('qi-inject');
                const want = parseInt(el?.value) || 0;
                const usable = Math.min(want, getQi(), window.getEsoterismeMaxDice());
                ctx.extraDice = usable;
                ctx.qiUsed = usable;
            },

            // Débite le Qi consommé
            afterRoll(res, ctx) {
                if (ctx.qiUsed > 0) {
                    spendQi(ctx.qiUsed);
                    const el = document.getElementById('qi-inject');
                    if (el) el.value = 0;
                }
            }
        }
    });

})();
