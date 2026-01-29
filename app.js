// ===============================
// 0. 전역 & DOM 헬퍼
// ===============================
let currentClientRef = null;
let currentPhoneDigits = ""; // 전화번호(숫자만) 캐시 // 현재 선택/작업 중인 고객 문서 참조
const programConfigMap = {}; // Firestore에서 불러온 프로그램 설정

function $(id) {
  return document.getElementById(id);
}

function getValue(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function formatDateTime(ts) {
  if (!ts || !ts.toDate) return "-";
  const d = ts.toDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function formatKRW(num) {
  if (num == null || isNaN(num)) return "";
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ===============================
// 1. 오늘 날짜 표시
// ===============================
function setToday() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  setText("todayDisplay", `${y}-${m}-${d}`);
}

// ===============================
// 2. 증상별 EO 프리셋
// ===============================
const symptomEoPresets = {
  pain: [
    {
      name: "로즈마리 ct.버베논",
      effects: "근육통, 긴장성 두통, 혈행 촉진, 림프 순환",
      dilution: "바디 1~2%, 국소 3% 이내",
      caution: "고혈압·경련성 질환·임산부 주의",
    },
    {
      name: "마조람 스위트",
      effects: "근육 경직 완화, 요통, 복부 경련",
      dilution: "바디 1.5~2.5%",
      caution: "저혈압 고객 저농도 권장",
    },
  ],
  edema: [
    {
      name: "시프러스",
      effects: "림프·정맥 순환, 부종 완화",
      dilution: "바디 1.5~2.5%",
      caution: "임산부 장기 사용 피하기",
    },
    {
      name: "주니퍼베리",
      effects: "수분 정체·부종 완화",
      dilution: "바디 1~2%",
      caution: "신장 질환 고객 주의",
    },
  ],
  fatigue: [
    {
      name: "스위트 오렌지",
      effects: "피로 완화, 기분 전환",
      dilution: "바디 1~2%",
      caution: "햇빛 직전 고농도 사용 피함",
    },
    {
      name: "로즈마리 시네올",
      effects: "활력, 각성, 집중력",
      dilution: "바디 1~2%",
      caution: "고혈압 고객 저녁 사용 주의",
    },
  ],
  stress: [
    {
      name: "라벤더",
      effects: "긴장 완화, 진정",
      dilution: "바디 1~2%",
      caution: "라벤더 민감 고객 확인",
    },
    {
      name: "버가못 FCF",
      effects: "불안 완화, 무기력 개선",
      dilution: "바디 1~2%",
      caution: "일광 전 고농도 사용 주의",
    },
  ],
  sleep: [
    {
      name: "라벤더",
      effects: "수면 보조, 근육 이완",
      dilution: "바디 1~2%",
      caution: "",
    },
    {
      name: "로만 캐모마일",
      effects: "진정, 불안 완화",
      dilution: "바디 1~2%",
      caution: "국화과 알레르기 고객 확인",
    },
  ],
  digest: [
    {
      name: "스위트 오렌지",
      effects: "소화, 복부 팽만",
      dilution: "바디 1~2%",
      caution: "빛 노출 주의",
    },
    {
      name: "진저",
      effects: "복부 냉증, 소화 불편",
      dilution: "바디 0.5~1.5%",
      caution: "자극 가능성",
    },
  ],
  hormone: [
    {
      name: "클라리 세이지",
      effects: "PMS, 갱년기",
      dilution: "바디 1~2%",
      caution: "호르몬 의존성 질환 고객 피하기",
    },
    {
      name: "제라늄",
      effects: "호르몬 밸런스, 부종",
      dilution: "바디 1~2%",
      caution: "임신 초기 피하기",
    },
  ],
  skin: [
    {
      name: "티트리",
      effects: "여드름, 살균",
      dilution: "페이스 0.5%, 바디 1~2%",
      caution: "건성 피부 저농도",
    },
    {
      name: "라벤더",
      effects: "진정, 회복",
      dilution: "페이스 0.5~1%",
      caution: "",
    },
  ],
  brain: [
    {
      name: "로즈마리 시네올",
      effects: "집중력, 두통",
      dilution: "바디 1~2%",
      caution: "고혈압 고객 주의",
    },
    {
      name: "페퍼민트",
      effects: "두통, 각성",
      dilution: "국소 1%",
      caution: "임산부·수유부·어린이 금지",
    },
  ],
  postpartum: [
    {
      name: "마조람",
      effects: "산후 통증 완화",
      dilution: "바디 1.5~2.5%",
      caution: "저혈압 고객 주의",
    },
    {
      name: "제라늄",
      effects: "산후 부종·기분 완화",
      dilution: "바디 1~2%",
      caution: "",
    },
  ],
};

function renderEoRecommendations() {
  const box = $("eoRecommendations");
  if (!box) return;

  const checked = document.querySelectorAll(
    '#symptomTags input[type="checkbox"]:checked'
  );
  const keys = Array.from(checked).map((el) => el.value);

  if (keys.length === 0) {
    box.innerHTML =
      '증상을 선택한 뒤 왼쪽의 <strong>“증상 기반 EO 추천 보기”</strong> 버튼을 눌러주세요.';
    return;
  }

  let html = "";
  keys.forEach((key) => {
    const list = symptomEoPresets[key];
    if (!list) return;

    html += `<div class="eo-section-title">[${key}] EO 가이드</div>`;

    list.forEach((eo) => {
      html += `
        <div class="eo-card">
          <div class="eo-name">${eo.name}</div>
          <div class="eo-line"><strong>효능</strong>: ${eo.effects}</div>
          <div class="eo-line"><strong>희석</strong>: ${eo.dilution}</div>
          <div class="eo-line caution"><strong>주의</strong>: ${eo.caution}</div>
        </div>`;
    });
  });

  box.innerHTML = html;
}

// ===============================
// 3. 프로그램별 EO·제품 추천(이름 기준)
// ===============================
const programExtraByName = {
  "제품 상담 및 테라피 상담": {
    eo: [],
    products: [],
    notes: "1회 상담 전용. 프로그램 안내, 제품 상담 중심.",
  },
  "온열뱀부 풋 케어": {
    eo: ["시프러스", "주니퍼베리"],
    products: ["하체 슬림/부종 케어 오일", "풋 스크럽"],
    notes: "하체 부종·냉증·피로에 초점.",
  },
  "온열뱀부 등 케어": {
    eo: ["로즈마리", "마조람", "스위트 오렌지"],
    products: ["등·경추 전용 바디오일"],
    notes: "등·어깨·경추 긴장 완화, 스트레스 완화.",
  },
  "스페셜 풋 케어": {
    eo: ["페퍼민트", "시프러스"],
    products: ["풋 스크럽", "풋 전용 오일"],
    notes: "각질+순환+피로 케어를 동시에.",
  },
  "경추 브레인 케어": {
    eo: ["로즈마리 시네올", "프랑킨센스"],
    products: ["두피·경추 브레인 오일"],
    notes: "집중력·두통·뇌 피로 완화.",
  },
  "온열뱀부 복부 케어": {
    eo: ["진저", "스위트 오렌지", "마조람"],
    products: ["복부 전용 오일", "디톡스 솔트"],
    notes: "복부 냉증·소화·호르몬 케어.",
  },
  "온열뱀부 기본 바디 케어": {
    eo: ["라벤더", "로즈마리"],
    products: ["전신 바디오일"],
    notes: "전신 순환·피로 회복 기본 케어.",
  },
  "온열뱀부 바디 바디 케어": {
    eo: ["자몽", "사이프러스", "로즈마리"],
    products: ["슬리밍 바디오일", "디톡스 솔트"],
    notes: "부종·셀룰라이트·몸무게 관리 집중.",
  },
  "온열뱀부 페이셜 케어": {
    eo: ["라벤더", "제라늄", "프랑킨센스"],
    products: ["페이셜 오일", "미백/재생 마스크"],
    notes: "피부 밸런스·톤·재생 케어.",
  },
  "씨솔트바디디톡스": {
    eo: ["자몽", "시프러스", "주니퍼베리"],
    products: ["씨솔트 바디 스크럽"],
    notes: "전신 디톡스·순환·각질 케어.",
  },
  "커피앤솔트슬림스크럽": {
    eo: ["커피 CO2", "사이프러스", "자몽"],
    products: ["커피앤씨솔트 슬림 스크럽"],
    notes: "셀룰라이트·슬리밍 집중 바디 스크럽.",
  },
  "아사히베리미백, 재생": {
    eo: ["프랑킨센스", "라벤더", "제라늄"],
    products: ["아사이베리 미백/재생 크림"],
    notes: "미백·탄력·재생에 초점.",
  },
  "산후관리 (premium)": {
    eo: ["마조람", "제라늄", "라벤더"],
    products: ["산후 골반/복부 케어 오일"],
    notes: "산후 골반·부종·수면·감정 케어.",
  },
  "온열뱀부 침향 뜸": {
    eo: ["침향", "프랑킨센스"],
    products: ["침향 오일·좌훈/뜸 전용"],
    notes: "심신 안정·깊은 이완·명상케어.",
  },
  "뉴로피드백 뇌파 검사": {
    eo: [],
    products: [],
    notes: "검사 위주. 필요 시 브레인 케어와 연계.",
  },
};

// ===============================
// 4. 프로그램 설정 불러오기 (config_programs)
// ===============================
function getSelectedProgramConfig() {
  const selectEl = $("programSelect");
  if (!selectEl) return null;
  const id = selectEl.value;
  if (!id) return null;
  return programConfigMap[id] || null;
}

async function initProgramSelect() {
  const selectEl = $("programSelect");
  const statusEl = $("programStatus");
  if (!selectEl || typeof db === "undefined") return;

  selectEl.innerHTML = '<option value="">프로그램 선택</option>';
  if (statusEl) statusEl.textContent = "선택 전";

  try {
    const snap = await db.collection("config_programs").get();

    snap.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;

      programConfigMap[id] = {
        id,
        name: data.name || id,
        basePrice: Number(data.basePrice) || 0,
        finalPrice:
          Number(
            data.finalPrice != null ? data.finalPrice : data.basePrice
          ) || 0,
        totalSessions: Number(data.totalSessions) || 0,
        unitPrice: Number(data.unitPrice) || 0,
        intervalDays: Number(data.intervalDays) || 0,
        durationMinutes: Number(data.durationMinutes) || 0,
      };

      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = data.name || id;
      selectEl.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    alert("프로그램 목록을 불러오는 중 오류가 발생했습니다.");
  }
}

// 자동 계산 (정가/남은횟수/다음권장일)
function recalcProgramPricing() {
  const config = getSelectedProgramConfig();

  const unitInput = $("sessionUnitPrice");
  const totalInput = $("totalSessionsInput");
  const baseInput = $("programBasePrice");
  const finalInput = $("programFinalPrice");
  const usedInput = $("usedSessionsInput");
  const listDisplay = $("packageListPriceDisplay");
  const remainingDisplay = $("remainingSessionsDisplay");
  const nextDisplay = $("nextAppointmentDisplay");

  let unit = unitInput && unitInput.value ? Number(unitInput.value) : NaN;
  let total = totalInput && totalInput.value ? Number(totalInput.value) : NaN;
  let used = usedInput && usedInput.value ? Number(usedInput.value) : 0;

  if (config) {
    if (!unit || isNaN(unit)) {
      if (config.unitPrice) unit = config.unitPrice;
      else if (config.basePrice && config.totalSessions) {
        unit = config.basePrice / config.totalSessions;
      }
    }
    if (!total || isNaN(total)) {
      total = config.totalSessions || 0;
    }
  }

  if (unitInput && (!unitInput.value || isNaN(Number(unitInput.value)))) {
    if (unit) unitInput.value = Math.round(unit);
  }
  if (totalInput && (!totalInput.value || isNaN(Number(totalInput.value)))) {
    if (total) totalInput.value = total;
  }

  const base =
    unit && total && !isNaN(unit) && !isNaN(total) ? unit * total : NaN;

  if (baseInput && (isNaN(Number(baseInput.value)) || !baseInput.value)) {
    if (!isNaN(base)) baseInput.value = Math.round(base);
  }

  if (finalInput && !finalInput.value) {
    if (config && config.finalPrice) finalInput.value = config.finalPrice;
    else if (!isNaN(base)) finalInput.value = Math.round(base);
  }

  if (listDisplay) {
    if (!isNaN(base) && unit && total) {
      listDisplay.textContent = `예: ${formatKRW(
        unit
      )}원 × ${total}회 = ${formatKRW(base)}원 (정가 기준)`;
    } else {
      listDisplay.textContent =
        "예: 180,000원 × 10회 = 1,800,000원 (정가 기준)";
    }
  }

  if (remainingDisplay && total) {
    const remaining = total - (isNaN(used) ? 0 : used);
    if (!isNaN(remaining)) {
      remainingDisplay.textContent = `${remaining} 회 (오늘 방문 전 기준)`;
    } else {
      remainingDisplay.textContent = "-";
    }
  }

  if (nextDisplay) {
    const interval = config && config.intervalDays ? config.intervalDays : 0;
    if (interval > 0) {
      const d = new Date();
      d.setDate(d.getDate() + interval);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      nextDisplay.textContent = `${y}-${m}-${day}`;
    } else {
      nextDisplay.textContent = "-";
    }
  }
}

// 프로그램 선택 시 EO/제품 추천 + 기본값 세팅
function updateProgramRecommendations() {
  const box = $("programProductRecommendations");
  const statusEl = $("programStatus");
  if (!box) return;

  const config = getSelectedProgramConfig();

  if (!config) {
    if (statusEl) statusEl.textContent = "선택 전";
    box.innerHTML =
      "관리 프로그램을 선택하면, 해당 프로그램에 최적화된 EO 세트와 로블코코/엘라곰 제품 추천 리스트가 표시됩니다.";
    recalcProgramPricing();
    return;
  }

  if (statusEl) statusEl.textContent = `선택됨: ${config.name}`;

  const extra = programExtraByName[config.name] || {};
  const durationText = config.durationMinutes
    ? `${config.durationMinutes}분`
    : "";

  let html = '<div class="eo-card">';
  if (durationText) {
    html += `<div class="eo-line"><strong>소요시간</strong>: ${durationText}</div>`;
  }
  const priceForView = config.unitPrice || config.basePrice;
  if (priceForView) {
    html += `<div class="eo-line"><strong>1회 금액</strong>: ${formatKRW(
      priceForView
    )}원</div>`;
  }
  if (extra.eo && extra.eo.length) {
    html += `<div class="eo-line"><strong>추천 EO</strong>: ${extra.eo.join(
      " / "
    )}</div>`;
  }
  if (extra.products && extra.products.length) {
    html += `<div class="eo-line"><strong>추천 제품</strong>: ${extra.products.join(
      " / "
    )}</div>`;
  }
  if (extra.notes) {
    html += `<div class="small-muted">${extra.notes}</div>`;
  }
  html += "</div>";

  box.innerHTML = html;

  // 입력 필드 기본값 세팅
  if ($("sessionUnitPrice") && !$("sessionUnitPrice").value && config.unitPrice)
    $("sessionUnitPrice").value = config.unitPrice;
  if ($("totalSessionsInput") && !$("totalSessionsInput").value && config.totalSessions)
    $("totalSessionsInput").value = config.totalSessions;
  if ($("programBasePrice") && !$("programBasePrice").value && config.basePrice)
    $("programBasePrice").value = config.basePrice;
  if (
    $("programFinalPrice") &&
    !$("programFinalPrice").value &&
    config.finalPrice
  )
    $("programFinalPrice").value = config.finalPrice;

  recalcProgramPricing();
}

// ===============================
// 5. 사진 미리보기
// ===============================
function handlePhotoPreview(inputId, previewId) {
  const input = $(inputId);
  const preview = $(previewId);
  if (!input || !preview) return;

  const file = input.files[0];
  if (!file) {
    preview.textContent = "이미지를 선택해주세요.";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.innerHTML = `<img src="${e.target.result}" />`;
  };
  reader.readAsDataURL(file);
}

// ===============================
// 6. Firebase 업로드
// ===============================
async function uploadPhotoIfExists(id, folder, clientId) {
  const input = $(id);
  if (!input || !input.files || !input.files[0]) return null;
  if (typeof storage === "undefined") return null;

  const file = input.files[0];
  const ref = storage.ref(`${folder}/${clientId}/${Date.now()}_${file.name}`);
  await ref.put(file);
  return await ref.getDownloadURL();
}

// ===============================
// 7. 고객 생성/업데이트
// ===============================
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

  // phoneDigits 기준으로 기존 고객 찾기
  const snap = await db
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

// ===============================
// 8. 상담 저장
// ===============================
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

// ===============================
// 9. 고객 검색
// ===============================
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
    alert("해당 고객을 찾지 못했습니다. 새 고객으로 등록 후 저장하면 자동으로 생성됩니다.");
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

  // 검색 후 즉시 최근 상담 불러오기 시도 (없으면 알림만 뜸)
  await loadLastSession();

  alert("고객 정보를 불러왔습니다.");
}

// ===============================
// 10. 리포트 생성 & PDF
// ===============================
function generateReportPreview() {
  const symptomLabels = Array.from(
    document.querySelectorAll('#symptomTags input[type="checkbox"]:checked')
  ).map((el) => el.parentElement.textContent.trim());

  const lines = [];
  lines.push(`고객명: ${getValue("clientName")} (${getValue("ageRangeSelect")})`);
  lines.push(`연락처: ${getValue("clientPhone")}`);
  lines.push("");
  lines.push(`오늘 컨디션: ${getValue("visitReason")}`);
  lines.push(`주요 증상: ${symptomLabels.join(", ") || "-"}`);
  lines.push("");
  lines.push(`프로그램: ${getValue("programSelect")}`);
  lines.push(`시술 내용: ${getValue("sessionTechniques")}`);
  lines.push(`사용 제품: ${getValue("sessionProducts")}`);
  lines.push("");
  lines.push("다음 계획:");
  lines.push(getValue("sessionNextPlan"));

  const box = $("autoReport");
  if (box) box.textContent = lines.join("\n");

  alert("자동 상담 리포트가 생성되었습니다.");
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

  try {
    // 1순위: clientId 기준 (인덱스 사용)
    let snap = await db
      .collection("sessions")
      .where("clientId", "==", currentClientRef.id)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    // 2순위: 예전 데이터 호환 (clientRef 기준)
    if (snap.empty) {
      snap = await db
        .collection("sessions")
        .where("clientRef", "==", currentClientRef)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    }

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

    // 증상 체크박스 반영
    const selected = new Set(d.symptoms || []);
    document.querySelectorAll('#symptomTags input[type="checkbox"]').forEach((el) => {
      el.checked = selected.has(el.value);
    });

    // Contra 체크 반영
    const contraSelected = new Set(d.contraTags || []);
    document.querySelectorAll('#contraTags input[type="checkbox"]').forEach((el) => {
      el.checked = contraSelected.has(el.value);
    });

    updateEoGuideBySymptoms();
    alert("최근 상담 내용을 불러왔습니다.");
  } catch (e) {
    console.error(e);
    const msg = String(e?.message || "");
    if (msg.includes("requires an index")) {
      alert("불러오기를 위해 Firestore 인덱스 생성이 필요합니다. (이미 만들었다면 새로고침 후 다시 시도)");
      return;
    }
    alert("불러오기 중 오류가 발생했습니다. 콘솔(F12)을 확인해주세요.");
  }
}

async function generateSummaryReport() {
  if (!currentClientRef) {
    alert("먼저 고객을 선택하거나 검색해주세요.");
    return;
  }
  if (typeof db === "undefined") {
    alert("Firebase 설정을 먼저 확인해주세요.");
    return;
  }

  try {
    // 1순위: clientId 기준
    let snap = await db
      .collection("sessions")
      .where("clientId", "==", currentClientRef.id)
      .orderBy("createdAt", "asc")
      .get();

    // 2순위: 예전 데이터 호환 (clientRef 기준)
    if (snap.empty) {
      snap = await db
        .collection("sessions")
        .where("clientRef", "==", currentClientRef)
        .orderBy("createdAt", "asc")
        .get();
    }

    const box = $("autoReport");
    if (!box) return;

    if (snap.empty) {
      box.textContent = "누적 상담 기록이 없습니다.";
      alert("누적 상담 기록이 없습니다.");
      return;
    }

    let html = `누적 상담 리포트 (최근~과거)\n\n`;
    let idx = 1;

    snap.forEach((doc) => {
      const d = doc.data();
      const symptoms = (d.symptoms || []).join(" · ");
      html += `${idx}회차\n`;
      html += `증상: ${symptoms || "-"}\n`;
      html += `시술: ${d.sessionTechniques || "-"}\n`;
      html += `제품: ${d.sessionProducts || "-"}\n`;
      html += `레시피: ${d.eoRecipeNote || "-"}\n`;
      html += `다음계획: ${d.sessionNextPlan || "-"}\n`;
      html += `------------------------------\n`;
      idx++;
    });

    box.textContent = html;
    alert("누적 상담 리포트를 생성했습니다.");
  } catch (e) {
    console.error(e);
    const msg = String(e?.message || "");
    if (msg.includes("requires an index")) {
      alert("누적 리포트를 위해 Firestore 인덱스가 필요합니다. 콘솔에 표시된 링크로 Create index 후 다시 시도하세요.");
      return;
    }
    alert("누적 리포트 생성 중 오류. 콘솔(F12)을 확인해주세요.");
  }
}

function downloadReportPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF 라이브러리가 로드되지 않았습니다.");
    return;
  }

  const box = $("autoReport");
  if (!box) {
    alert("리포트 영역이 없습니다.");
    return;
  }

  const text = box.textContent || "";
  if (!text.trim()) {
    alert("리포트 내용이 없습니다.");
    return;
  }

  const doc = new window.jspdf.jsPDF();
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 15, 20);

  const name = getValue("clientName") || "client";
  doc.save(`consult_${name}.pdf`);
}

// ===============================
// 11. 초기 실행
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  setToday();
  initProgramSelect();

  const programSelect = $("programSelect");
  if (programSelect) {
    programSelect.addEventListener("change", updateProgramRecommendations);
  }

  const unitInput = $("sessionUnitPrice");
  const totalInput = $("totalSessionsInput");
  const usedInput = $("usedSessionsInput");

  if (unitInput) {
    unitInput.addEventListener("change", recalcProgramPricing);
    unitInput.addEventListener("keyup", recalcProgramPricing);
  }
  if (totalInput) {
    totalInput.addEventListener("change", recalcProgramPricing);
    totalInput.addEventListener("keyup", recalcProgramPricing);
  }
  if (usedInput) {
    usedInput.addEventListener("change", recalcProgramPricing);
    usedInput.addEventListener("keyup", recalcProgramPricing);
  }

  const beforeInput = $("beforePhotoInput");
  if (beforeInput) {
    beforeInput.addEventListener("change", () =>
      handlePhotoPreview("beforePhotoInput", "beforePhotoPreview")
    );
  }
  const afterInput = $("afterPhotoInput");
  if (afterInput) {
    afterInput.addEventListener("change", () =>
      handlePhotoPreview("afterPhotoInput", "afterPhotoPreview")
    );
  }
});
// PWA 설치를 위한 서비스워커 등록
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.log("Service worker registration failed:", err));
  });
}
