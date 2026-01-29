function isStandaloneMode() {
  const iosStandalone = window.navigator.standalone === true;
  const mqlStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || mqlStandalone;
}


let currentClientRef = null; // 현재 선택/작업 중인 고객
let currentPhoneDigits = ""; // 전화번호(숫자만) 캐시

function normalizePhoneDigits(v) {
  return (v || "").replace(/\D/g, "");
}

function $(id) {
  return document.getElementById(id);
}

function getValue(id) {
  const el = $(id);
  if (!el) return "";
  return (el.value || "").trim();
}

function setToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const el = $("todayDate");
  if (el) el.textContent = `${yyyy}-${mm}-${dd}`;
}


const programs = [
  { id: "", name: "프로그램 선택", intervalDays: 0 },
  { id: "bamboo_lymph", name: "온열뱀부 림프순환", intervalDays: 7 },
  { id: "bamboo_detox", name: "온열뱀부 디톡스", intervalDays: 7 },
  { id: "postpartum", name: "산후 골반·부종 케어", intervalDays: 7 },
  { id: "brain_sleep", name: "브레인·수면 케어", intervalDays: 7 },
];

function renderPrograms() {
  const sel = $("programSelect");
  if (!sel) return;
  sel.innerHTML = "";
  programs.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function getSelectedProgram() {
  const id = getValue("programSelect");
  return programs.find((p) => p.id === id) || programs[0];
}


function updateEoGuideBySymptoms() {
  const symptoms = Array.from(
    document.querySelectorAll('#symptomTags input[type="checkbox"]:checked')
  ).map((el) => el.value);

  const contra = Array.from(
    document.querySelectorAll('#contraTags input[type="checkbox"]:checked')
  ).map((el) => el.value);

  const box = $("eoRecommendations");
  if (!box) return;

  if (symptoms.length === 0) {
    box.innerHTML =
      '증상을 선택한 뒤 왼쪽의 <strong>“증상 기반 EO 추천 보기”</strong> 버튼을 눌러주세요.';
    return;
  }

  
  const map = {
    "스트레스/불안": ["라벤더", "베르가못", "프랑킨센스"],
    "수면장애/불면": ["라벤더", "로만캐모마일", "샌달우드"],
    "부종/림프정체": ["사이프러스", "그레이프프룻", "주니퍼베리"],
    "근육통/결림/요통": ["마조람스위트", "진저", "블랙페퍼"],
    "두통/집중저하/브레인": ["로즈마리", "페퍼민트", "레몬"],
  };

  let oils = [];
  symptoms.forEach((s) => {
    if (map[s]) oils = oils.concat(map[s]);
  });

  oils = Array.from(new Set(oils));

  const contraText =
    contra.length > 0
      ? `<div style="margin-top:8px" class="muted">주의사항 체크: ${contra.join(
          ", "
        )}</div>`
      : "";

  box.innerHTML = `
    <div style="font-weight:800;margin-bottom:6px">추천 EO</div>
    <div>${oils.join(" · ") || "선택된 증상에 대한 추천 데이터가 없습니다."}</div>
    ${contraText}
    <div style="margin-top:10px" class="muted">
      실제 사용 여부/농도는 고객 상태에 따라 원장님이 최종 판단합니다.
    </div>
  `;
}


async function getOrCreateClient() {
  if (typeof db === "undefined") {
    alert("Firebase 설정을 먼저 확인해주세요.");
    throw new Error("db undefined");
  }

  const name = getValue("clientName");
  const phoneRaw = getValue("clientPhone");
  const phoneDigits = normalizePhoneDigits(phoneRaw);

  if (!name || !phoneDigits) {
    alert("이름과 전화번호는 필수입니다.");
    throw new Error("missing name/phone");
  }

  const ageRange = getValue("ageRangeSelect");
  const constitution = getValue("clientConstitution");
  const clientNote = getValue("clientNote");

  let snap = await db
    .collection("clients")
    .where("phoneDigits", "==", phoneDigits)
    .limit(1)
    .get();

  if (!snap.empty) {
    const ref = snap.docs[0].ref;
    await ref.update({
      name,
      phone: phoneRaw,
      phoneDigits,
      ageRange,
      constitution,
      clientNote,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    currentClientRef = ref;
    currentPhoneDigits = phoneDigits;
    return ref;
  }

  const ref = await db.collection("clients").add({
    name,
    phone: phoneRaw,
    phoneDigits,
    ageRange,
    constitution,
    clientNote,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  currentClientRef = ref;
  currentPhoneDigits = phoneDigits;
  return ref;
}

async function searchClient() {
  const keyword = getValue("searchKeyword");
  if (!keyword) {
    alert("검색어를 입력해주세요. (전화번호 또는 이름 전체)");
    return;
  }
  if (typeof db === "undefined") {
    alert("Firebase 설정을 먼저 확인해주세요.");
    return;
  }

  const digits = normalizePhoneDigits(keyword);

  let query = db.collection("clients");
  if (digits.length >= 9) {
    query = query.where("phoneDigits", "==", digits);
  } else {
    query = query.where("name", "==", keyword.trim());
  }

  const snap = await query.limit(1).get();
  if (snap.empty) {
    alert(
      "해당 고객을 찾지 못했습니다. 새 고객으로 등록 후 저장하면 자동으로 생성됩니다."
    );
    currentClientRef = null;
    currentPhoneDigits = "";
    return;
  }

  const doc = snap.docs[0];
  const data = doc.data();

  $("clientName").value = data.name || "";
  $("clientPhone").value = data.phone || "";
  $("ageRangeSelect").value = data.ageRange || "";
  $("clientConstitution").value = data.constitution || "";
  $("clientNote").value = data.clientNote || "";

  currentClientRef = doc.ref;
  currentPhoneDigits = data.phoneDigits || normalizePhoneDigits(data.phone || "");

  // 검색 후 자동으로 마지막 상담을 폼에 채움
  await loadLastSession();

  alert("고객 정보를 불러왔습니다.");
}


async function uploadPhotoIfExists(inputId, prefix, clientId) {
  const input = $(inputId);
  if (!input || !input.files || input.files.length === 0) return "";

  if (typeof storage === "undefined") {
    console.warn("storage undefined");
    return "";
  }

  const file = input.files[0];
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `before_after/${clientId}/${prefix}_${Date.now()}.${ext}`;
  const ref = storage.ref().child(path);
  await ref.put(file);
  return await ref.getDownloadURL();
}


async function saveSession() {
  try {
    const clientRef = await getOrCreateClient();

    const symptoms = Array.from(
      document.querySelectorAll('#symptomTags input[type="checkbox"]:checked')
    ).map((el) => el.value);

    const data = {
      clientRef,
      clientId: clientRef.id,
      phoneDigits: currentPhoneDigits || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      visitReason: getValue("visitReason"),
      symptoms,
      program: getValue("programSelect"),
      sessionTechniques: getValue("sessionTechniques"),
      sessionProducts: getValue("sessionProducts"),
      eoRecipeNote: getValue("eoRecipeNote"),
      sessionNextPlan: getValue("sessionNextPlan"),
      contraTags: Array.from(
        document.querySelectorAll('#contraTags input[type="checkbox"]:checked')
      ).map((el) => el.value),
    };

    data.beforePhotoUrl = await uploadPhotoIfExists(
      "beforePhotoInput",
      "before",
      clientRef.id
    );
    data.afterPhotoUrl = await uploadPhotoIfExists(
      "afterPhotoInput",
      "after",
      clientRef.id
    );

    await db.collection("sessions").add(data);

    alert("오늘 상담 내용이 저장되었습니다.");
  } catch (e) {
    console.error(e);
    alert("저장 중 오류가 발생했습니다. 콘솔(F12)을 확인해주세요.");
  }
}

async function loadLastSession() {
  if (!currentClientRef) {
    alert("먼저 고객을 선택하거나 저장해주세요.");
    return;
  }
  if (typeof db === "undefined") {
    alert("Firebase 설정을 먼저 확인해주세요.");
    return;
  }

  const snap = await db
    .collection("sessions")
    .where("clientId", "==", currentClientRef.id)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    alert("최근 상담 기록이 없습니다.");
    return;
  }

  const d = snap.docs[0].data();

  $("visitReason").value = d.visitReason || "";
  $("sessionTechniques").value = d.sessionTechniques || "";
  $("sessionProducts").value = d.sessionProducts || "";
  $("eoRecipeNote").value = d.eoRecipeNote || "";
  $("sessionNextPlan").value = d.sessionNextPlan || "";
  if ($("programSelect")) $("programSelect").value = d.program || "";

  
  const selected = new Set(d.symptoms || []);
  document.querySelectorAll('#symptomTags input[type="checkbox"]').forEach((el) => {
    el.checked = selected.has(el.value);
  });

 
  const contraSelected = new Set(d.contraTags || []);
  document.querySelectorAll('#contraTags input[type="checkbox"]').forEach((el) => {
    el.checked = contraSelected.has(el.value);
  });

  updateEoGuideBySymptoms();

  alert("최근 상담 내용을 불러왔습니다.");
}


function generateReportPreview() {
  const box = $("reportPreview");
  if (!box) return;

  const name = getValue("clientName");
  const phone = getValue("clientPhone");
  const visitReason = getValue("visitReason");

  const symptoms = Array.from(
    document.querySelectorAll('#symptomTags input[type="checkbox"]:checked')
  ).map((el) => el.value);

  const program = getSelectedProgram();

  box.innerHTML = `
    <div style="font-weight:900;margin-bottom:8px">상담 요약</div>
    <div>고객: <strong>${name || "-"}</strong> / ${phone || "-"}</div>
    <div style="margin-top:8px"><strong>오늘 컨디션</strong><br/>${(visitReason || "-").replace(
      /\n/g,
      "<br/>"
    )}</div>
    <div style="margin-top:8px"><strong>증상</strong><br/>${
      symptoms.length ? symptoms.join(" · ") : "-"
    }</div>
    <div style="margin-top:8px"><strong>프로그램</strong><br/>${
      program?.name || "-"
    }</div>
    <div style="margin-top:10px" class="muted">
      이 리포트는 설명용 요약입니다. 실제 적용은 원장 판단 기준입니다.
    </div>
  `;
}

async function generateSummaryReport() {
  if (!currentClientRef) {
    alert("먼저 고객을 검색하거나 저장해주세요.");
    return;
  }
  if (typeof db === "undefined") {
    alert("Firebase 설정을 먼저 확인해주세요.");
    return;
  }

  try {
    const snap = await db
      .collection("sessions")
      .where("clientId", "==", currentClientRef.id)
      .orderBy("createdAt", "asc")
      .get();

    if (snap.empty) {
      alert("누적 상담 기록이 없습니다.");
      return;
    }

    let html = `<div style="font-weight:900;margin-bottom:10px">누적 상담 리포트 (최근~과거)</div>`;
    snap.docs.forEach((doc, idx) => {
      const d = doc.data();
      const symptoms = (d.symptoms || []).join(" · ");
      html += `
        <div style="border-top:1px dashed rgba(0,0,0,0.15);padding-top:10px;margin-top:10px">
          <div style="font-weight:800">${idx + 1}회차</div>
          <div class="muted">증상: ${symptoms || "-"}</div>
          <div class="muted">시술: ${(d.sessionTechniques || "-").replace(/\n/g, "<br/>")}</div>
          <div class="muted">제품: ${(d.sessionProducts || "-").replace(/\n/g, "<br/>")}</div>
          <div class="muted">레시피: ${(d.eoRecipeNote || "-").replace(/\n/g, "<br/>")}</div>
          <div class="muted">다음계획: ${(d.sessionNextPlan || "-").replace(/\n/g, "<br/>")}</div>
        </div>
      `;
    });

    const box = $("reportPreview");
    if (box) box.innerHTML = html;

    alert("누적 상담 리포트를 생성했습니다.");
  } catch (e) {
    console.error(e);
    alert("누적 리포트 생성 중 오류. 콘솔(F12)을 확인해주세요.");
  }
}

async function downloadReportPdf() {
  try {
    const box = $("reportPreview");
    if (!box) return;
    const text = box.innerText || "리포트 내용 없음";

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    const lines = doc.splitTextToSize(text, 520);
    doc.text(lines, 40, 60);
    doc.save("consult_report.pdf");
  } catch (e) {
    console.error(e);
    alert("PDF 다운로드 중 오류. 콘솔(F12)을 확인해주세요.");
  }
}


function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  // GitHub Pages/https/localhost 환경에서만 정상
  navigator.serviceWorker
    .register("./sw.js", { scope: "./" })
    .catch((err) => console.warn("Service worker registration failed:", err));
}

document.addEventListener("DOMContentLoaded", () => {
  setToday();
  renderPrograms();
  registerSW();
});








