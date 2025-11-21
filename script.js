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
    曜: "secondary",
    限: "secondary",
    学期: "normal",
    年: "normal",
    クラス: "normal",
    科目名: "primary",
    担当者: "normal",
    講義コード: "normal",
    教室: "normal",
    備考: "normal"
};
const dataName = {
    曜: "dow",
    限: "hour",
    学期: "semester",
    年: "schoolYear",
    クラス: "class",
    科目名: "subject",
    担当者: "teacher",
    講義コード: "courseCode",
    教室: "room",
    備考: "notes"
};
const shortenSemester = {
    前期前半: "1Q",
    前期後半: "2Q",
    後期前半: "3Q",
    後期後半: "4Q",
    通年: "通年",
    集中講義: "集中"
};
const jsonForm = {
    selectedClasses: [
        // "yaam1234", "bbbm5678"
    ],
    userData: [
        {
            // classId: "yaam1234",
            // emoji: "📚",
            // userComment: "hogefuga",
            // attendance: {
            //     "attended": 10,
            //     "absent": 2,
            //     "late": 1,
            //     "earlyLeave": 0
            // }
        }
    ]
};

document.addEventListener("DOMContentLoaded", async function () {
    const modalDialog = document.getElementsByClassName('modalDialog')[0];
    const dialogButton = document.getElementById('loadTimetableData');
    const addButton = document.querySelector('#dialog-container button#add');
    const cancelButton = document.querySelector('#dialog-container button#cancel');
    // const dataInfo = document.getElementById("dataInfo");
    // const data = loadSavedItems();
    // dataInfo.innerHTML = `保存されている授業：${data["selectedClasses"].length}件<br>${data["selectedClasses"]}`;

    const loadedTable = await loadTable();
    updateMainView(loadedTable);
    displayCommits();

    dialogButton.addEventListener('click', async () => {
        console.log("clicked");
        modalDialog.showModal();
        loadCheckboxStatus();

        // モーダルダイアログを表示する際に背景部分がスクロールしないようにする
        document.documentElement.style.overflow = "hidden";
    });

    addButton.addEventListener('click', (event) => {
        const checkedItems = getCheckedItems();
        console.log("追加する講義コード一覧:", checkedItems);

        console.log("保存済みデータ:", loadSavedItems());

        var data = loadSavedItems();
        console.log("現在の保存データ:", data["selectedClasses"]);
        console.log(typeof data["selectedClasses"]);

        // チェックされている講義コードを追加する
        checkedItems.forEach(item => {
            if (!data["selectedClasses"].includes(item)) {
                data["selectedClasses"].push(item);
            }
        });

        // LocalStorageに保存する
        localStorage.setItem("userData", JSON.stringify(data));

        // 表示の更新
        refreshCourseDisplay();

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

    const recordAttendanceButton = document.getElementById("recordAttendance");

    recordAttendanceButton.addEventListener("click", function () {
        const url = "https://call.off.tcu.ac.jp/";
        window.open(url, "_blank");
    });


});

function makeJsonString(arr) {
    return JSON.stringify(arr);
}

// CSVデータのパース
function parseCSV(data) {
    // 文字コード関連の処理をしとく
    data = data.replace(/^\uFEFF/, '');
    const rows = data.split("\n");
    // ヘッダー行を取得する
    const headers = rows[0].split(",").map(header => header.trim());

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

// 表のヘッダー行を作るよ
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

        // データタイプをdata-type属性に設定
        th.dataset.type = DATA_TYPES[key];
        // スマホの表示情報を dataset に与える
        th.dataset.spDisplay = DISPLAIES_FOR_SP[key];
        th.addEventListener("click", function () {
            setSort(th, records);
        });
        // ヘッダー行にセルを追加
        headerRow.append(th);
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
        const existData = loadSavedItems();

        if (!existData["selectedClasses"].includes(record["講義コード"])) {
            for (let key in record) {
                const td = document.createElement("td");
                td.dataset.spDisplay = DISPLAIES_FOR_SP[key];
                td.id = dataName[key];

                if (key === "科目名") {
                    const syllabusBaseURL = "https://websrv.tcu.ac.jp/tcu_web_v3/slbssbdr.do?value(risyunen)=2025&value(semekikn)=1&value(kougicd)=";
                    const classId = record["講義コード"];
                    const syllabusURL = `${syllabusBaseURL}${encodeURIComponent(classId)}`;
                    // td.innerHTML = `<a href='${syllabusURL}' target="_blank" class='course-name-link' >${record[key]}</a>`;

                    td.innerHTML = `<p id="sp-label">${key}（クリックでシラバスに遷移）</p><a href='${syllabusURL}' target="_blank" class='course-name-link' >${record[key]}</a>`;


                    // if (keyword) {
                    //     const regexp = new RegExp(keyword, "g");
                    //     const replaced = td.innerHTML.replace(regexp, (match) => {
                    //         return `<mark>${match}</mark>`;
                    //     });
                    //     td.innerHTML = replaced; // ハイライトを反映させるためにinnerHTMLを使用
                    // }

                    tr.appendChild(td);

                    // } else if (key === "学期") {
                    //     td.innerHTML = `<p id="sp-label">${key}</p>${shortenSemester[record[key]] || record[key]}`;
                    //     tr.appendChild(td);

                } else if (key !== "受講対象/再履修者科目名") {
                    recordText = record[key] === "" ? "-" : record[key];
                    td.innerHTML = `<p id="sp-label">${key}</p>${recordText}`;
                    const text = record[key];

                    if (keyword) {
                        const regexp = new RegExp(keyword, "g");
                        const replaced = text.replace(regexp, (match) => {
                            return `<mark>${match}</mark>`;
                        });
                        td.innerHTML = replaced; // ハイライトを反映させるためにinnerHTMLを使用
                    }
                    tr.appendChild(td);
                }

            }

            // チェックボックス関連の処理
            const checkboxTd = document.createElement("td");
            checkboxTd.id = "checkbox";
            const checkboxLabel = document.createElement("p");
            checkboxLabel.id = "sp-label";
            checkboxLabel.textContent = "追加";
            checkboxTd.appendChild(checkboxLabel);
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

            // 検索件数を把握
            const resultsSummary = document.querySelector(".search-results-summary p");
            resultsSummary.textContent = `${tbody.children.length - 1}件の検索結果`;
        }
    }
}

// 選択されている講義の数を取得
function getCheckedCount() {
    const allCheckboxes = document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']");
    const checkedCount = Array.from(allCheckboxes).filter(checkbox => checkbox.checked);
    const idCount = checkedCount.map(item => item.id)
    const removedDuplicates = Array.from(new Set(idCount)); // 重複をなくす
    return removedDuplicates.length;
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

// 現在画面上で選択されている講義コードをすべて取得
function getCheckedItems() {
    const allCheckboxes = document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']");
    const checkedItemIds = Array.from(allCheckboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.id);
    const removedDuplicates = Array.from(new Set(checkedItemIds)); // 重複をなくす
    return removedDuplicates;
}

// 保存されている講義コードを取得
function loadSavedItems() {
    const storedData = localStorage.getItem("userData");
    if (storedData !== null) {
        return JSON.parse(storedData);
        // return storedData;
    } else {
        return jsonForm;
    }
}

// 保存されている講義コードに基づいてチェックボックスの状態を復元
function loadCheckboxStatus() {
    const allCheckboxes = document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']");

    allCheckboxes.forEach(checkbox => {
        // IDが一致する場合、チェックを入れる
        const existData = loadSavedItems();
        if (existData["selectedClasses"].includes(checkbox.id)) {
            checkbox.checked = true;
        }
    });
}

// "追加"ボタンの表示を更新
function updateButtonStatus(addButton) {
    addButton.innerHTML = `追加（${getCheckedCount()}件）`;
}

// チェックボックスにイベントリスナーを追加
function updateCheckboxListeners(addButton) {
    document.querySelectorAll("#fullTimetableContainer tbody input[type='checkbox']")
        .forEach(checkbox => {
            checkbox.addEventListener("change", () => {
                updateButtonStatus(addButton);
            });
        });
}

// UI更新用の共通関数
function refreshCourseDisplay() {
    const storedData = localStorage.getItem("userData");
    try {

        location.reload();

        if (typeof loadCheckboxStatus === "function") {
            loadCheckboxStatus();
        }

        const addButton = document.querySelector('#dialog-container button#add');
        if (addButton && typeof updateButtonStatus === "function") {
            updateButtonStatus(addButton);
        }
    } catch (e) {
        console.error("表示の更新に失敗しました:", e);
    }
}

async function loadTable() {
    try {
        const response = await fetch("./resource/43c5a4c0ada5df3ce3386851eb65e2d1_timetable.csv");
        const data = await response.text();

        const timetable = parseCSV(data);
        const elements = createTableContents(timetable);
        const master = document.getElementById("fullTimetableContainer");
        const table = master.querySelector("table");

        // 既存の内容をクリア
        table.innerHTML = "";

        table.append(elements[0]); // thead
        table.append(elements[1]); // tbody

        const addButton = document.querySelector('#dialog-container button#add');
        updateCheckboxListeners(addButton);

        return timetable;
    } catch (error) {
        console.error("時間割データの読み込みに失敗しました:", error);
        throw error;
    }
}

// 今日の曜日を取得する関数
function getTodayDayOfWeek() {
    const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
    const today = new Date();
    const dayIndex = today.getDay(); // 0(日曜)〜6(土曜)
    return daysOfWeek[dayIndex];
}

async function updateMainView(loadedTable) {
    const items = loadSavedItems();
    console.log("loaded items:", items["selectedClasses"]);
    const addedCourses = items["selectedClasses"];
    const dataInfo = document.getElementById("dataInfo");

    // 今日の曜日を取得
    const todayDow = getTodayDayOfWeek();
    console.log("今日の曜日:", todayDow);
    const todayDowElement = document.getElementById("dayofweek");
    todayDowElement.textContent = `今日（${todayDow}曜日）の授業`;

    if (dataInfo) {
        // dataInfo.innerHTML = `保存されている授業:${addedCourses.length} 件 <br> ${addedCourses} `;
        console.log("addedCourses:", addedCourses);
        const ulElement = document.querySelector('.todaysClass ul');

        // テンプレートとして最初のli要素を取得
        const liTemplate = ulElement.querySelector('li');

        // ulの中身をクリア
        ulElement.innerHTML = '';

        var classInfo = [];

        for (let i = 0; i < addedCourses.length; i++) {
            const classId = addedCourses[i];
            console.log("処理中の講義コード:", classId);

            classInfo = classInfo.concat(loadedTable.filter((item) => item["講義コード"] === classId));

            console.log("取得した授業情報:", classInfo);

            if (!classInfo) {
                console.warn(`講義コード ${classId} の情報が見つかりません`);
                continue;
            }
        }

        for (let p = 0; p < classInfo.length; p++) {
            const classId = classInfo[p]["講義コード"];
            const classInfoEntry = classInfo[p];

            console.log("処理中の授業情報:", classInfoEntry);

            console.log("曜日比較:", classInfoEntry["曜"], "==", todayDow, "結果:", classInfoEntry["曜"] == todayDow);
            console.log("限比較:", classInfoEntry["限"], "型:", typeof classInfoEntry["限"]);

            // 今日の曜日と一致する授業のみ表示
            if (classInfoEntry["曜"] == todayDow) {
                // liテンプレートを複製
                const liElement = liTemplate.cloneNode(true);

                // 時限の設定
                const period = classInfoEntry["限"];
                liElement.querySelector("p").id = `tc-${period}`;
                liElement.querySelector("p").textContent = `${period}限`;

                // 授業情報の設定
                const text = liElement.querySelector("#classInfo #tc-text");
                text.querySelector("#tc-subject").textContent = classInfoEntry["科目名"];
                text.querySelector("span #tc-room").textContent = classInfoEntry["教室"];
                text.querySelector("span #tc-teacher").textContent = classInfoEntry["担当者"];

                // WebClassリンクの設定
                const iconSection = liElement.querySelector("#classInfo #tc-icon");
                iconSection.querySelector("#tc-webclass").href = `https://webclass.tcu.ac.jp/webclass/login.php?group_id=25${classId}&auth_mode=SAML`;

                console.log("授業を追加:", classInfoEntry["科目名"], period + "限");

                // 複製した要素をulに追加
                ulElement.appendChild(liElement);
            }
        }

        if (ulElement.children.length === 0) {
            const noClassMessage = document.getElementById("noClassMessage");
            noClassMessage.textContent = "今日は登録されている授業はありません。";
        }
    }
}

function getClassInfoById(loadedTable, classId) {
    // const items = ;
    console.log(items);
    return items;
}

// 現在の時間に応じて挨拶を変更
document.addEventListener("DOMContentLoaded", function () {
    const heading = document.querySelector("h1");

    const now = new Date();
    const hours = now.getHours();

    if (hours >= 5 && hours < 12) {
        heading.textContent = "おはようございます ☀️";
    } else if (hours >= 12 && hours < 18) {
        heading.textContent = "こんにちは 🌞";
    } else {
        heading.textContent = "こんばんは 🌙";
    }
});

// GitHubのリリース情報を取得して表示する関数
// 基本的な取得例
async function getGitHubCommits(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits`;

    try {
        const response = await fetch(url);
        const releases = await response.json();
        console.log('Fetched commits:', releases);
        return releases;
    } catch (error) {
        console.error('Error fetching releases:', error);
    }
}

async function displayCommits() {
    const commits = await getGitHubCommits('rea-sna', 'tcu-course-sp');
    const container = document.getElementById('updateHistory');

    commits.forEach(commit => {
        console.log('Commit:', commit);
        const commitHTML = `
        <ul>
            <li id="commit-date">${new Date(commit.commit.author.date).toLocaleDateString('ja-JP')}</li>
            <li><a href="${commit.html_url}" target="_blank">${commit.commit.message}</a></li>
        </ul>
    `;
        container.innerHTML += commitHTML;
    });
}