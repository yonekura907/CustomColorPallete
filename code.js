"use strict";
// Custom Color Pallet for Figma / FigJam / Slides
// - ZENKIGEN ブランドカラーを初期パレットとして提供
// - カスタムカラーの追加 / 削除 / 保存 (figma.clientStorage)
// - 選択中の Sticky / Shape / Connector / Text / Section 等に色を適用
// ---- 定数 ----
const STORAGE_KEY = "customColorPalettes.v1";
// ZENKIGEN ブランドカラー (Primitive 代表色)
const BRAND_PRIMITIVE = [
    { name: "Black", hex: "#000000" },
    { name: "Gray 90", hex: "#454a4d" },
    { name: "Gray 50", hex: "#a4a5a6" },
    { name: "Gray 20", hex: "#e9eaeb" },
    { name: "White", hex: "#ffffff" },
    { name: "Blue 50", hex: "#0077d9" },
    { name: "Red 50", hex: "#d92b57" },
    { name: "Yellow 50", hex: "#ffd919" },
    { name: "Green 50", hex: "#2dc87d" },
    { name: "Purple 50", hex: "#7379ff" },
    { name: "BlueGreen 50", hex: "#17d4e5" },
];
// ZENKIGEN User パレット (FigJam 用途にフィットする柔らかい彩度)
const BRAND_USER = [
    { name: "Red", hex: "#f88282" },
    { name: "Pink", hex: "#f191dd" },
    { name: "Purple", hex: "#c88ae5" },
    { name: "Turquoise", hex: "#86cee5" },
    { name: "RoyalBlue", hex: "#93b3f2" },
    { name: "Blue", hex: "#7ecaf5" },
    { name: "Aquamarine", hex: "#79ebda" },
    { name: "YellowGreen", hex: "#8ae58b" },
    { name: "Yellow", hex: "#f3c90a" },
    { name: "Orange", hex: "#f9b12c" },
];
// ZENKIGEN User Light パレット
const BRAND_USER_LIGHT = [
    { name: "Red Light", hex: "#fddada" },
    { name: "Pink Light", hex: "#fbdef5" },
    { name: "Purple Light", hex: "#efdcf7" },
    { name: "Turquoise Light", hex: "#dbf0f7" },
    { name: "RoyalBlue Light", hex: "#dfe8fb" },
    { name: "Blue Light", hex: "#d8effc" },
    { name: "Aquamarine Light", hex: "#d7f9f4" },
    { name: "YellowGreen Light", hex: "#dcf7dc" },
    { name: "Yellow Light", hex: "#fcefb6" },
    { name: "Orange Light", hex: "#fde8c0" },
];
const DEFAULT_PALETTES = [
    {
        id: "zenkigen-user",
        name: "ZENKIGEN User",
        colors: BRAND_USER,
        builtIn: true,
    },
    {
        id: "zenkigen-user-light",
        name: "ZENKIGEN User Light",
        colors: BRAND_USER_LIGHT,
        builtIn: true,
    },
    {
        id: "zenkigen-primitive",
        name: "ZENKIGEN Primitive",
        colors: BRAND_PRIMITIVE,
        builtIn: true,
    },
];
// ---- ユーティリティ ----
function hexToRgb(hex) {
    const cleaned = hex.trim().replace(/^#/, "");
    const full = cleaned.length === 3
        ? cleaned
            .split("")
            .map((c) => c + c)
            .join("")
        : cleaned;
    if (!/^[0-9a-fA-F]{6}$/.test(full))
        return null;
    const r = parseInt(full.substring(0, 2), 16) / 255;
    const g = parseInt(full.substring(2, 4), 16) / 255;
    const b = parseInt(full.substring(4, 6), 16) / 255;
    return { r, g, b };
}
function solidPaint(rgb) {
    return { type: "SOLID", color: rgb };
}
// 選択中ノードに色を適用
function applyColor(hex, target) {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        figma.notify(`無効な色コードです: ${hex}`, { error: true });
        return 0;
    }
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
        figma.notify("オブジェクトを選択してください");
        return 0;
    }
    const paint = solidPaint(rgb);
    let applied = 0;
    for (const node of selection) {
        try {
            if (target === "stroke") {
                if ("strokes" in node) {
                    node.strokes = [paint];
                    applied++;
                }
                continue;
            }
            // Connector は線色で表現するのが自然
            if (node.type === "CONNECTOR") {
                node.strokes = [paint];
                applied++;
                continue;
            }
            // Sticky / Shape / Text / Section / 通常のシェイプ
            if ("fills" in node) {
                const fillable = node;
                fillable.fills = [paint];
                applied++;
                continue;
            }
            // fills が無いが strokes がある場合のフォールバック
            if ("strokes" in node) {
                node.strokes = [paint];
                applied++;
            }
        }
        catch (e) {
            // 個別ノードの失敗は無視して続行
            console.warn("apply failed on node", node.type, e);
        }
    }
    return applied;
}
// ---- 起動処理 ----
async function main() {
    figma.showUI(__html__, { width: 280, height: 480, themeColors: true });
    // 保存済みパレットを読み込み
    let saved;
    try {
        saved = (await figma.clientStorage.getAsync(STORAGE_KEY));
    }
    catch (_e) {
        saved = undefined;
    }
    const palettes = saved && Array.isArray(saved) && saved.length > 0
        ? mergeWithDefaults(saved)
        : DEFAULT_PALETTES.slice();
    figma.ui.postMessage({ type: "init", palettes });
}
// ビルトインパレットは常に最新を提供し、ユーザーカスタムはそのまま残す
function mergeWithDefaults(saved) {
    const builtInIds = new Set(DEFAULT_PALETTES.map((p) => p.id));
    const userPalettes = saved.filter((p) => !builtInIds.has(p.id) && !p.builtIn);
    return [...DEFAULT_PALETTES, ...userPalettes];
}
figma.ui.onmessage = async (msg) => {
    var _a;
    switch (msg.type) {
        case "apply-color": {
            if (!msg.hex)
                return;
            const target = (_a = msg.target) !== null && _a !== void 0 ? _a : "auto";
            const count = applyColor(msg.hex, target);
            if (count > 0) {
                figma.notify(`${count} 個のオブジェクトに ${msg.hex} を適用しました`);
            }
            break;
        }
        case "save-palettes": {
            if (!msg.palettes)
                return;
            // ユーザーが編集可能なのは builtIn ではないパレットのみ保存
            const toSave = msg.palettes.filter((p) => !p.builtIn);
            try {
                await figma.clientStorage.setAsync(STORAGE_KEY, toSave);
            }
            catch (_e) {
                figma.notify("パレットの保存に失敗しました", { error: true });
            }
            break;
        }
        case "notify": {
            if (msg.message)
                figma.notify(msg.message);
            break;
        }
        case "close": {
            figma.closePlugin();
            break;
        }
    }
};
main();
