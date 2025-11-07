// main.js
const DATA_TYPES = {
    曜日: "string",
    限: "number",
    学期: "string",
    年: "number",
    クラス: "string",
    科目名: "string",
    担当者: "string",
    講義コード: "string",
    教室: "string",
    備考: "string"
};
const DISPLAIES_FOR_SP = {
    曜: "primary",
    限: "primary",
    学期: "secondary",
    クラス: "secondary",
    科目名: "primary",
    担当者: "secondary",
    講義コード: "secondary",
    教室: "secondary",
    備考: "secondary"
};

document.addEventListener("DOMContentLoaded", function () {
    const modalDialog = document.getElementById('modalDialog');
    const dialogButton = document.getElementById('loadTimetableData');
    const addButton = document.querySelector('#dialog-container button#add');
    const cancelButton = document.querySelector('#dialog-container button#cancel');

    dialogButton.addEventListener('click', async () => {
        console.log("clicked");
        modalDialog.showModal();

        if (getCheckedCount() > 0) {
            addButton.innerHTML = `更新`;
        } else {
            addButton.innerHTML = `追加（${count}件）`;
        }

        loadCheckboxStatus();

        // モーダルダイアログを表示する際に背景部分がスクロールしないようにする
        document.documentElement.style.overflow = "hidden";
    });

    addButton.addEventListener('click', (event) => {
        const checkedItems = getCheckedItems();
        console.log("追加する講義コード一覧:", checkedItems);
        // JSON形式にしてから保存する（常に上書き）（stringしか保存できない）
        localStorage.setItem("addedCourses", JSON.stringify(checkedItems));

        event.preventDefault();
        modalDialog.close();
        document.documentElement.style.overflow = "auto";
    });

    cancelButton.addEventListener('click', (event) => {
        // 追加した分をすべて破棄する
        event.preventDefault();
        modalDialog.close();
        document.documentElement.style.overflow = "auto";
    });

    // CSVを読み込むよ
    fetch("./resource/timetable.csv")
        .then(function (response) {
            return response.text();
        })
        .then(function (data) {
            const timetable = parseCSV(data);
            const elements = createTableContents(timetable);
            const master = document.getElementById("fullTimetableContainer");
            const table = master.querySelector("table");
            table.append(elements[0]); // thead
            table.append(elements[1]); // tbody

            // チェックボックスが作成された後にイベントリスナーを追加
            updateCheckboxListeners(addButton);
        });
});



function parseCSV(data) {
    // 文字コード関連の処理をしとく
    data = data.replace(/^\uFEFF/, '');
    const rows = data.split("\n");
    // ヘッダー行を取得する
    const headers = rows[0].split(",").map(header => header.trim());
    // 検索件数を把握
    const resultsSummary = document.querySelector(".search-results-summary p");
    resultsSummary.textContent = `${rows.length - 1}件の検索結果`;

    // データ内容はこちらに入る
    const records = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(",").map(value => value.trim());
        if (values.length === 1 && values[0] === "") {
            continue;
        }
        let record = {};
        for (let j = 0; j < headers.length; j++) {
            record[headers[j]] = values[j];
        }
        records.push(record);
    }

    console.log("headers:", headers);
    console.log("records:", records);

    return records;
}

// 表の大枠？を作るよ
function createTableContents(timetable) {
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (let key in timetable[0]) {
        console.log("key:", key);
        const th = document.createElement("th");
        if (key === "科目名") {
            th.innerHTML = "科目名<br><small>科目名をクリックするとシラバスが表示できます</small>";
        } else if (key === "受講対象/再履修者科目名") {
            continue;
        } else {
            th.textContent = key;
        }

        th.dataset.type = DATA_TYPES[key]; // データタイプをdata-type属性に設定
        th.dataset.spDisplay = DISPLAIES_FOR_SP[key]; // スマホの表示情報を dataset に与える
        th.addEventListener("click", function () {
            setSort(th, records);
        });
        headerRow.append(th); // ヘッダー行にセルを追加
    }

    // チェックボックス列のヘッダーを追加
    const checkboxTh = document.createElement("th");
    checkboxTh.textContent = "追加する";
    headerRow.append(checkboxTh);

    thead.append(headerRow); // theadにヘッダー行を追加

    const tbody = document.createElement("tbody");
    createTableBodyRows(tbody, timetable);

    return [thead, tbody];
}

// 表の中身（データ行）をつくるよ
function createTableBodyRows(tbody, records, keyword, addButton) {
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const tr = document.createElement("tr");

        // キーワード検索のフィルタリング
        if (keyword) {
            let isMatch = false;
            for (const key in record) {
                if (record[key].includes(keyword)) {
                    isMatch = true;
                    break;
                }
            }
            if (!isMatch) {
                continue;
            }
        }

        for (let key in record) {
            const td = document.createElement("td");

            if (key === "科目名") {
                td.dataset.spDisplay = DISPLAIES_FOR_SP[key];
                const syllabusBaseURL = "https://websrv.tcu.ac.jp/tcu_web_v3/slbssbdr.do?value(risyunen)=2025&value(semekikn)=1&value(kougicd)=";
                const classId = record["講義コード"];
                const syllabusURL = `${syllabusBaseURL}${encodeURIComponent(classId)}`;
                td.innerHTML = `<a href='${syllabusURL}' target="_blank" class='course-name-link' >${record[key]}</a>`;

                if (keyword) {
                    const regexp = new RegExp(keyword, "g");
                    const replaced = td.innerHTML.replace(regexp, (match) => {
                        return `<mark>${match}</mark>`;
                    });
                    td.innerHTML = replaced; // ハイライトを反映させるためにinnerHTMLを使用
                }

                tr.appendChild(td);

            } else if (key !== "受講対象/再履修者科目名") {
                td.dataset.spDisplay = DISPLAIES_FOR_SP[key]; // スマホの表示情報を dataset に与える
                td.textContent = record[key]; // 各データセルに値を設定
                const text = record[key];

                if (keyword) {
                    const regexp = new RegExp(keyword, "g");
                    const replaced = text.replace(regexp, (match) => {
                        return `<mark>${match}</mark>`;
                    });
                    td.innerHTML = replaced; // ハイライトを反映させるためにinnerHTMLを使用
                }
                tr.appendChild(td);
            };
        }

        // チェックボックス関連の処理
        const checkboxTd = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "course-checkbox";
        checkbox.id = `${record["講義コード"] || i}`;

        // チェックボックス：changeイベントリスナー
        checkbox.addEventListener("change", (event) => {
            const box = event.target;
            const boxId = box.id;
            const isChecked = box.checked;
            tsuikaikou_processing(boxId, isChecked);
        });

        checkboxTd.appendChild(checkbox);
        tr.appendChild(checkboxTd);

        tbody.appendChild(tr);
    }
}

function getCheckedCount() {
    const allCheckboxes = document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']");
    const checkedCount = Array.from(allCheckboxes).filter(checkbox => checkbox.checked).length;
    return checkedCount;
}

// 対開講の処理
function tsuikaikou_processing(id, isChecked) {
    const allCheckboxes = document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']");
    allCheckboxes.forEach(checkbox => {
        // 同じ講義コードが2つ上なら、どちらにもチェックを入れる
        if (checkbox.id.includes(id) && (Array.from(allCheckboxes).filter(item => item.id === id).length >= 2)) {
            checkbox.checked = isChecked;
            console.log("対開講処理あり：", id);
        }
    });
}

function getCheckedItems() {
    const allCheckboxes = document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']");
    const checkedItemIds = Array.from(allCheckboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.id);
    return checkedItemIds;
}

function loadCheckedItems() {
    const storedData = localStorage.getItem("addedCourses");
    if (storedData) {
        return JSON.parse(storedData);
    } else {
        return [];
    }
}

function getDiff() {
    const allCheckboxes = document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']");
    const storedData = loadCheckedItems();
    const checkedCount = Array.from(allCheckboxes).filter(checkbox => checkbox.checked);
    const diffCount = checkedCount.filter(checkedCount => storedData.indexOf(checkedCount) === -1).length;
    return Math.abs(diffCount);
}

function loadCheckboxStatus() {
    const allCheckboxes = document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']");

    allCheckboxes.forEach(checkbox => {
        // IDが一致する場合、チェックを入れる
        if (loadCheckedItems().includes(checkbox.id)) {
            checkbox.checked = true;
        }
    });
}

function updateButtonStatus(addButton) {
    const count = getCheckedCount();
    addButton.innerHTML = `追加（${getDiff()}件）`;
}

function updateCheckboxListeners(addButton) {
    document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']")
        .forEach(checkbox => {
            checkbox.addEventListener("change", () => {
                updateButtonStatus(addButton);
            });
        });
}
