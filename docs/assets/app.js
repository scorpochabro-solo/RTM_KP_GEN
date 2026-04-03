const { PDFDocument, rgb } = window.PDFLib;

const MAX_ITEMS = 10;
const PHOTO_RENDER_SCALE = 3;

const BASE_COL_WIDTHS = [169, 230, 196, 81, 82, 120];
const BASE_COL_WIDTH_SUM = BASE_COL_WIDTHS.reduce((sum, value) => sum + value, 0);

const SHORT_HERO_SUBTITLE_TOP_OFFSET = 1335.0;
const HERO_SUBTITLE_SIZE = 20;
const HERO_SUBTITLE_MAX_WIDTH = 620.0;
const SHORT_INTRO_X = 100.0;
const SHORT_INTRO_TOP_OFFSET = 1838.0;
const SHORT_INTRO_FONT_SIZE = 17;
const SHORT_INTRO_LINE_HEIGHT = 24;
const SHORT_INTRO_MAX_WIDTH = 900.0;

const SHORT_TABLE_TOP_Y = 1646.0;
const SHORT_TABLE_WIDTH = 863.0;
const SHORT_COL_WIDTHS = [169.0, 228.0, 159.0, 101.0, 91.0, 115.0];
const SHORT_ROW_HEIGHT_BY_COUNT = {
    1: 114.0,
    2: 109.0,
    3: 108.0,
    4: 105.0,
};

const LONG_TABLE_TOP_OFFSETS = {
    5: 1476.0,
    6: 1476.0,
    7: 1476.0,
    8: 1544.0,
    9: 1476.0,
    10: 1476.0,
};

const LONG_ROW_HEIGHTS = {
    5: [150.0, 169.5, 130.5, 130.5, 247.5],
    6: [150.0, 169.5, 201.0, 211.0, 266.0, 211.0],
    7: [150.0, 169.5, 201.0, 211.0, 266.0, 211.0, 171.0],
    8: [182.0, 169.5, 170.0, 171.0, 157.0, 152.0, 171.0, 171.0],
    9: [150.0, 169.5, 201.0, 211.0, 266.0, 211.0, 211.0, 211.0, 211.0],
    10: [150.0, 169.5, 201.0, 211.0, 266.0, 211.0, 211.0, 211.0, 211.0, 211.0],
};

const LONG_TABLE_WIDTH = 696.0;

const LONG_TEXT_LAYOUTS = {
    5: { hero: { x: 222.0, y: 2681.0, size: 20.0 }, intro: { x: 206.0, y: 2295.5, size: 14.0, gap: 20.0 } },
    6: { hero: { x: 222.0, y: 3070.0, size: 20.0 }, intro: { x: 206.0, y: 2684.5, size: 14.0, gap: 20.0 } },
    7: { hero: { x: 222.0, y: 3211.0, size: 20.0 }, intro: { x: 206.0, y: 2825.5, size: 14.0, gap: 20.0 } },
    8: { hero: { x: 222.0, y: 3205.0, size: 20.0 }, intro: { x: 203.0, y: 2793.5, size: 14.0, gap: 20.0 } },
    9: { hero: { x: 222.0, y: 3700.0, size: 20.0 }, intro: { x: 206.0, y: 3314.5, size: 14.0, gap: 20.0 } },
    10: { hero: { x: 222.0, y: 3884.0, size: 20.0 }, intro: { x: 206.0, y: 3498.5, size: 14.0, gap: 20.0 } },
};

const COLORS = {
    white: rgb(1, 1, 1),
    black: rgb(0, 0, 0),
    section: rgb(103 / 255, 103 / 255, 103 / 255),
};

const binaryCache = new Map();

const form = document.getElementById("proposal-form");
const itemsContainer = document.getElementById("items-container");
const itemsCountSelect = document.getElementById("items-count-select");
const submitButton = document.getElementById("submit-button");
const statusEl = document.getElementById("status");

document.addEventListener("DOMContentLoaded", () => {
    renderRows(Number(itemsCountSelect.value));
    itemsCountSelect.addEventListener("change", () => {
        renderRows(Number(itemsCountSelect.value));
    });

    form.addEventListener("submit", handleSubmit);
});

window.__rtmApp = {
    generatePdf,
    collectFormState,
};

function renderRows(count) {
    const rowsCount = clamp(Number(count) || 1, 1, MAX_ITEMS);
    itemsContainer.innerHTML = "";

    for (let index = 0; index < rowsCount; index += 1) {
        const row = document.createElement("div");
        row.className = "item-row";
        row.innerHTML = `
            <div class="item-index">${index + 1}</div>
            <div>
                <label class="field-label" for="item-name-${index}">Название</label>
                <input id="item-name-${index}" type="text" name="item_name[]" placeholder="НАЗВАНИЕ ТОВАРА" required>
                <label class="file-upload-label" for="item-photo-${index}">
                    <span class="file-upload-text">ФОТО +</span>
                </label>
                <input id="item-photo-${index}" type="file" name="item_photo[]" accept="image/*">
            </div>
            <div>
                <label class="field-label" for="item-desc-${index}">Описание</label>
                <textarea id="item-desc-${index}" name="item_desc[]" placeholder="Подробное описание..."></textarea>
            </div>
            <div>
                <label class="field-label" for="item-price-${index}">Цена</label>
                <input id="item-price-${index}" type="number" name="item_price[]" min="0" step="0.01" placeholder="0.00" required>
            </div>
            <div>
                <label class="field-label" for="item-qty-${index}">Кол-во</label>
                <input id="item-qty-${index}" type="number" name="item_qty[]" min="1" value="1" placeholder="1" required>
            </div>
        `;

        const fileInput = row.querySelector('input[type="file"]');
        const fileLabel = row.querySelector(".file-upload-label");
        const fileText = row.querySelector(".file-upload-text");
        fileInput.addEventListener("change", () => {
            if (fileInput.files && fileInput.files[0]) {
                fileText.textContent = fileInput.files[0].name.toUpperCase();
                fileLabel.classList.add("is-selected");
            } else {
                fileText.textContent = "ФОТО +";
                fileLabel.classList.remove("is-selected");
            }
        });

        itemsContainer.appendChild(row);
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("Собираю PDF локально в браузере...", "");

    try {
        const state = collectFormState();
        const pdfBytes = await generatePdf(state);
        const fileName = `KP_${sanitizeFilename(state.companyName) || "company"}.pdf`;
        downloadBytes(pdfBytes, fileName);
        setStatus("PDF готов и скачан.", "success");
    } catch (error) {
        setStatus(error.message || "Не удалось собрать PDF.", "error");
    } finally {
        setLoading(false);
    }
}

function collectFormState() {
    const companyName = String(form.elements.company_name.value || "").trim();
    if (!companyName) {
        throw new Error("Укажи название компании.");
    }

    const rows = Array.from(itemsContainer.querySelectorAll(".item-row"));
    const items = rows.map((row) => {
        const name = String(row.querySelector('input[name="item_name[]"]').value || "").trim();
        const desc = String(row.querySelector('textarea[name="item_desc[]"]').value || "").trim();
        const price = parsePrice(row.querySelector('input[name="item_price[]"]').value);
        const qty = parseQty(row.querySelector('input[name="item_qty[]"]').value);
        const photoFile = row.querySelector('input[name="item_photo[]"]').files[0] || null;

        if (!name) {
            throw new Error("У каждой позиции должно быть название.");
        }
        if (price < 0 || Number.isNaN(price)) {
            throw new Error(`Некорректная цена у позиции «${name}».`);
        }
        if (qty < 1 || Number.isNaN(qty)) {
            throw new Error(`Некорректное количество у позиции «${name}».`);
        }

        return {
            name,
            desc,
            price,
            qty,
            sum: roundTo(price * qty, 2),
            photoFile,
        };
    });

    if (!items.length) {
        throw new Error("Добавь хотя бы одну позицию.");
    }

    return { companyName, items };
}

async function generatePdf({ companyName, items }) {
    const itemCount = clamp(items.length, 1, MAX_ITEMS);
    const templateBytes = await fetchBinary(`./assets/templates/${itemCount}cloth.pdf`);
    const fontBytes = await fetchBinary("./assets/fonts/Inter.ttf");

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(window.fontkit);

    const font = await pdfDoc.embedFont(fontBytes, { subset: true });
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    const totals = items.reduce(
        (accumulator, item) => ({
            totalSum: accumulator.totalSum + item.sum,
            totalQty: accumulator.totalQty + item.qty,
        }),
        { totalSum: 0, totalQty: 0 },
    );

    drawDynamicTextBlocks(page, font, width, height, companyName, itemCount);
    await drawItemsTable(page, pdfDoc, font, width, height, items, totals.totalSum, totals.totalQty);

    return pdfDoc.save();
}

function drawDynamicTextBlocks(page, font, pageWidth, pageHeight, companyName, itemCount) {
    const cleanName = companyName.trim() || "Компания";
    const heroPrefix = "Мерч для проекта «";
    const heroSuffix = "»";
    const isShort = itemCount <= 4;

    if (isShort) {
        const availableCompanyWidth = HERO_SUBTITLE_MAX_WIDTH - measureText(font, `${heroPrefix}${heroSuffix}`, HERO_SUBTITLE_SIZE);
        const heroCompany = fitLine(cleanName, font, HERO_SUBTITLE_SIZE, Math.max(120, availableCompanyWidth));
        const heroLine = `${heroPrefix}${heroCompany}${heroSuffix}`;
        const heroX = (pageWidth - measureText(font, heroLine, HERO_SUBTITLE_SIZE)) / 2;
        const heroY = pageHeight - SHORT_HERO_SUBTITLE_TOP_OFFSET;
        page.drawText(heroLine, { x: heroX, y: heroY, font, size: HERO_SUBTITLE_SIZE, color: COLORS.white });
    } else {
        const layout = LONG_TEXT_LAYOUTS[itemCount];
        const maxLineWidth = Math.max(220, pageWidth - layout.hero.x - 40);
        const fixedWidth = measureText(font, `${heroPrefix}${heroSuffix}`, layout.hero.size);
        const heroCompany = fitLine(cleanName, font, layout.hero.size, Math.max(140, maxLineWidth - fixedWidth));
        page.drawText(`${heroPrefix}${heroCompany}${heroSuffix}`, {
            x: layout.hero.x,
            y: layout.hero.y,
            font,
            size: layout.hero.size,
            color: COLORS.white,
        });
    }

    const introText = [
        "Представляем комплексное предложение по производству брендированного мерча",
        `для проекта «${cleanName}». Все позиции с маркировкой в «Честном Знаке»,`,
        "премиальное качество исполнения.",
    ].join(" ");

    if (isShort) {
        const introLines = wrapLines(introText, font, SHORT_INTRO_FONT_SIZE, SHORT_INTRO_MAX_WIDTH, 3);
        drawTextLines(page, introLines, {
            x: SHORT_INTRO_X,
            y: pageHeight - SHORT_INTRO_TOP_OFFSET,
            font,
            size: SHORT_INTRO_FONT_SIZE,
            leading: SHORT_INTRO_LINE_HEIGHT,
            color: COLORS.section,
        });
    } else {
        const layout = LONG_TEXT_LAYOUTS[itemCount];
        const introLines = wrapLines(introText, font, layout.intro.size, 700, 3);
        drawTextLines(page, introLines, {
            x: layout.intro.x,
            y: layout.intro.y,
            font,
            size: layout.intro.size,
            leading: layout.intro.gap,
            color: COLORS.section,
        });
    }
}

async function drawItemsTable(page, pdfDoc, font, pageWidth, pageHeight, items, totalSum, totalQty) {
    const itemCount = items.length;
    const isShort = itemCount <= 4;
    const { tableX, tableTopY, rowHeights, colWidths } = resolveTableLayout(itemCount, pageWidth, pageHeight);
    const tableWidth = colWidths.reduce((sum, value) => sum + value, 0);
    const bodyFontSize = tableWidth >= 820 ? 14 : 12;
    const bodyLeading = bodyFontSize + 2;
    const xPositions = [];

    let currentX = tableX;
    for (const width of colWidths) {
        xPositions.push(currentX);
        currentX += width;
    }

    let currentTop = tableTopY;
    for (let index = 0; index < items.length; index += 1) {
        const rowHeight = rowHeights[index];
        const rowTop = currentTop;
        const rowBottom = rowTop - rowHeight;
        const item = items[index];

        drawCellText(page, {
            text: item.name,
            font,
            size: bodyFontSize,
            leading: bodyLeading,
            color: COLORS.black,
            x: xPositions[0],
            width: colWidths[0],
            rowTop,
            rowBottom,
            align: "left",
            valign: isShort ? "middle" : "top",
            leftPadding: isShort ? 16 : 6,
            rightPadding: isShort ? 8 : 5,
            topPadding: isShort ? 0 : 6,
        });

        drawCellText(page, {
            text: item.desc,
            font,
            size: bodyFontSize,
            leading: bodyLeading,
            color: COLORS.black,
            x: xPositions[1],
            width: colWidths[1],
            rowTop,
            rowBottom,
            align: "left",
            valign: isShort ? "middle" : "top",
            leftPadding: isShort ? 12 : 6,
            rightPadding: isShort ? 8 : 6,
            topPadding: isShort ? 0 : 6,
        });

        if (item.photoFile) {
            const photoBox = resolvePhotoBox(colWidths[2], rowHeight, isShort);
            const embeddedImage = await embedPhoto(pdfDoc, item.photoFile, photoBox.width, photoBox.height);
            page.drawImage(embeddedImage, {
                x: xPositions[2] + photoBox.paddingX,
                y: rowBottom + photoBox.paddingY,
                width: photoBox.width,
                height: photoBox.height,
            });
        }

        const numberValign = isShort ? "middle" : "top";
        const numberTopPadding = isShort ? 0 : 6;

        drawCellText(page, {
            text: formatInteger(item.price),
            font,
            size: bodyFontSize,
            leading: bodyLeading,
            color: COLORS.black,
            x: xPositions[3],
            width: colWidths[3],
            rowTop,
            rowBottom,
            align: "center",
            valign: numberValign,
            leftPadding: 0,
            rightPadding: 0,
            topPadding: numberTopPadding,
        });

        drawCellText(page, {
            text: String(item.qty),
            font,
            size: bodyFontSize,
            leading: bodyLeading,
            color: COLORS.black,
            x: xPositions[4],
            width: colWidths[4],
            rowTop,
            rowBottom,
            align: "center",
            valign: numberValign,
            leftPadding: 0,
            rightPadding: 0,
            topPadding: numberTopPadding,
        });

        drawCellText(page, {
            text: formatInteger(item.sum),
            font,
            size: bodyFontSize,
            leading: bodyLeading,
            color: COLORS.black,
            x: xPositions[5],
            width: colWidths[5],
            rowTop,
            rowBottom,
            align: "center",
            valign: numberValign,
            leftPadding: 0,
            rightPadding: 0,
            topPadding: numberTopPadding,
        });

        currentTop = rowBottom;
    }

    if (!isShort) {
        const tableHeight = rowHeights.reduce((sum, value) => sum + value, 0);
        const tableBottomY = tableTopY - tableHeight;
        const valueY = tableBottomY - 60.0;
        const totalQtyText = String(totalQty || 0);
        const totalSumText = formatInteger(totalSum);
        page.drawText(totalQtyText, {
            x: 231.0,
            y: valueY,
            font,
            size: 14,
            color: COLORS.black,
        });
        const totalSumWidth = measureText(font, totalSumText, 14);
        page.drawText(totalSumText, {
            x: 875.0 - totalSumWidth,
            y: valueY,
            font,
            size: 14,
            color: COLORS.black,
        });
    }
}

function drawCellText(page, options) {
    const {
        text,
        font,
        size,
        leading,
        color,
        x,
        width,
        rowTop,
        rowBottom,
        align,
        valign,
        leftPadding,
        rightPadding,
        topPadding,
    } = options;

    const normalizedText = String(text || "").replace(/\r?\n/g, " ").trim();
    if (!normalizedText) {
        return;
    }

    const availableWidth = Math.max(24, width - leftPadding - rightPadding);
    const maxLines = Math.max(1, Math.floor((rowTop - rowBottom - topPadding) / leading));
    const lines = wrapLines(normalizedText, font, size, availableWidth, maxLines);
    const blockHeight = (Math.max(lines.length - 1, 0) * leading) + size;

    let firstBaselineY;
    if (valign === "middle") {
        const rowHeight = rowTop - rowBottom;
        const topGap = Math.max(0, (rowHeight - blockHeight) / 2);
        firstBaselineY = rowBottom + topGap + blockHeight - size;
    } else {
        firstBaselineY = rowTop - topPadding - size;
    }

    lines.forEach((line, index) => {
        const y = firstBaselineY - (index * leading);
        if (y < rowBottom - size) {
            return;
        }

        const lineWidth = measureText(font, line, size);
        let drawX = x + leftPadding;
        if (align === "center") {
            drawX = x + ((width - lineWidth) / 2);
        } else if (align === "right") {
            drawX = x + width - rightPadding - lineWidth;
        }

        page.drawText(line, {
            x: drawX,
            y,
            font,
            size,
            color,
        });
    });
}

function drawTextLines(page, lines, options) {
    const { x, y, font, size, leading, color } = options;
    lines.forEach((line, index) => {
        page.drawText(line, {
            x,
            y: y - (index * leading),
            font,
            size,
            color,
        });
    });
}

function resolveTableLayout(itemCount, pageWidth, pageHeight) {
    if (itemCount <= 4) {
        const rowHeight = SHORT_ROW_HEIGHT_BY_COUNT[itemCount];
        return {
            tableX: (pageWidth - SHORT_TABLE_WIDTH) / 2,
            tableTopY: SHORT_TABLE_TOP_Y,
            rowHeights: Array.from({ length: itemCount }, () => rowHeight),
            colWidths: [...SHORT_COL_WIDTHS],
        };
    }

    const tableTopY = pageHeight - (LONG_TABLE_TOP_OFFSETS[itemCount] || 1476);
    const rowHeights = [...(LONG_ROW_HEIGHTS[itemCount] || [])];
    const scale = LONG_TABLE_WIDTH / BASE_COL_WIDTH_SUM;
    const colWidths = BASE_COL_WIDTHS.map((width) => width * scale);
    colWidths[colWidths.length - 1] += LONG_TABLE_WIDTH - colWidths.reduce((sum, value) => sum + value, 0);

    return {
        tableX: (pageWidth - LONG_TABLE_WIDTH) / 2,
        tableTopY,
        rowHeights,
        colWidths,
    };
}

function resolvePhotoBox(colWidth, rowHeight, isShort) {
    if (isShort) {
        const width = Math.max(92, Math.min(108, colWidth - 18));
        const height = Math.max(62, Math.min(rowHeight - 12, width * 0.74));
        return {
            width,
            height,
            paddingX: Math.max(8, (colWidth - width) / 2),
            paddingY: Math.max(6, (rowHeight - height) / 2),
        };
    }

    const paddingX = Math.max(8, Math.min(14, colWidth * 0.08));
    const width = Math.max(72, colWidth - (paddingX * 2));
    const targetHeight = Math.min(rowHeight * 0.7, width * 0.75);
    const maxHeight = Math.max(54, rowHeight - 16);
    const height = Math.min(Math.max(56, targetHeight), maxHeight);

    return {
        width,
        height,
        paddingX,
        paddingY: Math.max(4, (rowHeight - height) / 2),
    };
}

async function embedPhoto(pdfDoc, file, width, height) {
    const jpegBytes = await preparePhotoBytes(file, width, height);
    return pdfDoc.embedJpg(jpegBytes);
}

async function preparePhotoBytes(file, boxWidth, boxHeight) {
    const image = await loadFileAsImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(boxWidth * PHOTO_RENDER_SCALE));
    canvas.height = Math.max(1, Math.round(boxHeight * PHOTO_RENDER_SCALE));

    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;

    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

function loadFileAsImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Не удалось прочитать изображение."));
        reader.onload = () => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Не удалось открыть изображение."));
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function parsePrice(value) {
    const normalized = String(value || "").trim().replace(/\s+/g, "").replace(",", ".");
    return normalized ? Number(normalized) : 0;
}

function parseQty(value) {
    const normalized = String(value || "").trim();
    return normalized ? Number(normalized) : 1;
}

function fitLine(text, font, size, maxWidth) {
    const clean = String(text || "").trim();
    if (!clean) {
        return "";
    }
    if (measureText(font, clean, size) <= maxWidth) {
        return clean;
    }

    let trimmed = clean;
    while (trimmed && measureText(font, `${trimmed}...`, size) > maxWidth) {
        trimmed = trimmed.slice(0, -1);
    }
    return trimmed ? `${trimmed.trimEnd()}...` : "";
}

function wrapLines(text, font, size, maxWidth, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) {
        return [""];
    }

    const lines = [];
    let current = words[0];

    for (let index = 1; index < words.length; index += 1) {
        const candidate = `${current} ${words[index]}`;
        if (measureText(font, candidate, size) <= maxWidth) {
            current = candidate;
            continue;
        }

        lines.push(current);
        current = words[index];

        if (lines.length >= maxLines - 1) {
            const tail = [current, ...words.slice(index + 1)].join(" ");
            lines.push(fitLine(tail, font, size, maxWidth));
            return lines.slice(0, maxLines);
        }
    }

    lines.push(current);
    return lines.slice(0, maxLines);
}

function measureText(font, text, size) {
    return font.widthOfTextAtSize(String(text || ""), size);
}

async function fetchBinary(url) {
    if (!binaryCache.has(url)) {
        binaryCache.set(url, fetch(url).then(async (response) => {
            if (!response.ok) {
                throw new Error(`Не удалось загрузить ресурс: ${url}`);
            }
            return new Uint8Array(await response.arrayBuffer());
        }));
    }

    return binaryCache.get(url);
}

function formatInteger(value) {
    return Math.round(Number(value || 0)).toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

function roundTo(value, digits) {
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function sanitizeFilename(text) {
    return String(text || "")
        .trim()
        .replace(/[^\p{Letter}\p{Number}._-]+/gu, "_")
        .replace(/^_+|_+$/g, "");
}

function downloadBytes(bytes, fileName) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "СОБИРАЮ PDF..." : "СГЕНЕРИРОВАТЬ PDF";
}

function setStatus(message, tone) {
    statusEl.textContent = message || "";
    statusEl.className = "status";
    if (tone === "error") {
        statusEl.classList.add("is-error");
    }
    if (tone === "success") {
        statusEl.classList.add("is-success");
    }
}
