/**
 * Mental Health Detector — Student Wellness Assessment
 * Clean, lightweight, human-crafted client logic.
 */

(() => {
  "use strict";

  const CLOUD_API = "https://mansik-santulan-score.onrender.com";

  // Elements
  const form = document.getElementById("wellness-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const sampleDataBtn = document.getElementById("sample-data-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const toast = document.getElementById("toast");

  // State Containers
  const resultIdle = document.getElementById("result-idle");
  const resultLoading = document.getElementById("result-loading");
  const resultError = document.getElementById("result-error");
  const resultContent = document.getElementById("result-content");
  const retryBtn = document.getElementById("retry-btn");
  const retestBtn = document.getElementById("retest-btn");
  const copyBtn = document.getElementById("copy-btn");

  // Results Outputs
  const scoreDisplay = document.getElementById("score-display");
  const scoreBadge = document.getElementById("score-badge");
  const scoreSummaryText = document.getElementById("score-summary-text");
  const recsList = document.getElementById("recs-list");

  let habitChart = null;
  let currentScore = 0;

  // -------------------------------------------------------------------------
  // 1. Theme Management
  // -------------------------------------------------------------------------
  function initTheme() {
    const saved = localStorage.getItem("ms_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);

    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("ms_theme", next);
      if (habitChart) updateChartColors();
    });
  }

  // -------------------------------------------------------------------------
  // 2. Toast Utility
  // -------------------------------------------------------------------------
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  // -------------------------------------------------------------------------
  // 3. Slider Value Sync
  // -------------------------------------------------------------------------
  function initSliders() {
    const sliders = [
      { id: "avg_daily_usage_hours", displayId: "screen-time-val", unit: "hrs/day" },
      { id: "daily_unlocks", displayId: "unlocks-val", unit: "times" },
      { id: "sleep_hours_per_night", displayId: "sleep-val", unit: "hrs" },
      { id: "study_hours", displayId: "study-val", unit: "hrs" },
      { id: "physical_activity_hours", displayId: "exercise-val", unit: "hrs" },
    ];

    sliders.forEach(({ id, displayId, unit }) => {
      const input = document.getElementById(id);
      const display = document.getElementById(displayId);
      if (!input || !display) return;

      const update = () => {
        const val = parseFloat(input.value);
        display.textContent = `${val.toFixed(val % 1 === 0 ? 0 : 1)} ${unit}`;
      };

      input.addEventListener("input", update);
      update();
    });
  }

  // -------------------------------------------------------------------------
  // 4. Sample Data Filler
  // -------------------------------------------------------------------------
  function fillSampleData() {
    document.getElementById("age").value = 21;
    document.getElementById("gender").value = "Male";
    document.getElementById("academic_level").value = "Undergraduate";
    document.getElementById("country").value = "India";
    document.getElementById("most_used_platform").value = "Instagram";
    document.getElementById("purpose_of_use").value = "Entertainment";

    document.getElementById("avg_daily_usage_hours").value = 3.5;
    document.getElementById("daily_unlocks").value = 70;
    document.getElementById("sleep_hours_per_night").value = 7.5;
    document.getElementById("study_hours").value = 5.0;
    document.getElementById("physical_activity_hours").value = 1.0;

    const mediumRadio = document.querySelector('input[name="stress_level"][value="Medium"]');
    if (mediumRadio) mediumRadio.checked = true;

    // Trigger input events to update range text displays
    document.getElementById("avg_daily_usage_hours").dispatchEvent(new Event("input"));
    document.getElementById("daily_unlocks").dispatchEvent(new Event("input"));
    document.getElementById("sleep_hours_per_night").dispatchEvent(new Event("input"));
    document.getElementById("study_hours").dispatchEvent(new Event("input"));
    document.getElementById("physical_activity_hours").dispatchEvent(new Event("input"));

    clearErrors();
    showToast("Filled sample student profile");
  }

  // -------------------------------------------------------------------------
  // 5. Validation & Payload Gathering
  // -------------------------------------------------------------------------
  function clearErrors() {
    document.querySelectorAll(".error-text").forEach((el) => {
      el.textContent = "";
      el.classList.remove("visible");
    });
  }

  function setError(field, msg) {
    const el = document.querySelector(`[data-error-for="${field}"]`);
    if (el) {
      el.textContent = msg;
      el.classList.add("visible");
    }
  }

  function getPayload() {
    const fd = new FormData(form);
    return {
      age: parseInt(fd.get("age"), 10),
      gender: fd.get("gender"),
      country: (fd.get("country") || "").trim(),
      academic_level: fd.get("academic_level"),
      most_used_platform: fd.get("most_used_platform"),
      purpose_of_use: fd.get("purpose_of_use"),
      avg_daily_usage_hours: parseFloat(fd.get("avg_daily_usage_hours")),
      daily_unlocks: parseInt(fd.get("daily_unlocks"), 10),
      study_hours: parseFloat(fd.get("study_hours")),
      physical_activity_hours: parseFloat(fd.get("physical_activity_hours")),
      sleep_hours_per_night: parseFloat(fd.get("sleep_hours_per_night")),
      stress_level: fd.get("stress_level"),
    };
  }

  function validate(payload) {
    clearErrors();
    let valid = true;

    if (isNaN(payload.age) || payload.age < 10 || payload.age > 100) {
      setError("age", "Please enter a valid age (10–100).");
      valid = false;
    }
    if (!payload.country) {
      setError("country", "Country is required.");
      valid = false;
    }
    if (isNaN(payload.avg_daily_usage_hours)) {
      setError("avg_daily_usage_hours", "Please select screen time.");
      valid = false;
    }
    if (isNaN(payload.sleep_hours_per_night)) {
      setError("sleep_hours_per_night", "Please select sleep hours.");
      valid = false;
    }
    if (!payload.stress_level) {
      setError("stress_level", "Please select your stress level.");
      valid = false;
    }

    return valid;
  }

  // -------------------------------------------------------------------------
  // 6. View States
  // -------------------------------------------------------------------------
  function setViewState(state) {
    resultIdle.style.display = state === "idle" ? "flex" : "none";
    resultLoading.style.display = state === "loading" ? "flex" : "none";
    resultError.style.display = state === "error" ? "flex" : "none";
    resultContent.style.display = state === "result" ? "block" : "none";
  }

  // -------------------------------------------------------------------------
  // 7. Results & Habit Chart
  // -------------------------------------------------------------------------
  function renderChart(payload) {
    const canvas = document.getElementById("habitChart");
    if (!canvas) return;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#94A3B8" : "#475569";
    const gridColor = isDark ? "#24304A" : "#E2E8F0";

    // Distinct, vibrant colors for each lifestyle dimension
    const barColors = ["#3B82F6", "#EC4899", "#8B5CF6", "#10B981"];

    const data = {
      labels: ["Sleep (hrs)", "Screen Time (hrs)", "Study (hrs)", "Exercise (hrs)"],
      datasets: [
        {
          label: "Your Routine",
          data: [
            payload.sleep_hours_per_night,
            payload.avg_daily_usage_hours,
            payload.study_hours,
            payload.physical_activity_hours
          ],
          backgroundColor: barColors,
          borderRadius: 6,
        },
        {
          label: "Target Range",
          data: [8.0, 3.0, 5.0, 1.0],
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0",
          borderRadius: 6,
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: "600" }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: "600" } }
        }
      }
    };

    if (habitChart) {
      habitChart.destroy();
    }
    habitChart = new Chart(canvas, { type: "bar", data, options });
  }

  function updateChartColors() {
    if (!habitChart) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#94A3B8" : "#475569";
    const gridColor = isDark ? "#24304A" : "#E2E8F0";

    habitChart.options.plugins.legend.labels.color = textColor;
    habitChart.options.scales.x.grid.color = gridColor;
    habitChart.options.scales.x.ticks.color = textColor;
    habitChart.options.scales.y.ticks.color = textColor;
    habitChart.data.datasets[1].backgroundColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0";
    habitChart.update();
  }

  function getScoreDetails(score) {
    if (score >= 7.5) {
      return {
        badgeClass: "status-good",
        badgeText: "Healthy Balance",
        boxBg: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.08) 100%)",
        borderColor: "rgba(16, 185, 129, 0.3)",
        summary: "Your daily habits reflect steady emotional well-being. Good sleep and active routine are serving you well."
      };
    } else if (score >= 5.5) {
      return {
        badgeClass: "status-moderate",
        badgeText: "Moderate Balance",
        boxBg: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.08) 100%)",
        borderColor: "rgba(245, 158, 11, 0.3)",
        summary: "You have a stable baseline, though occasional high screen time or irregular sleep may cause energy dips."
      };
    } else {
      return {
        badgeClass: "status-risk",
        badgeText: "High Stress / Strain",
        boxBg: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(244, 63, 94, 0.08) 100%)",
        borderColor: "rgba(239, 68, 68, 0.3)",
        summary: "Your current lifestyle indicators show signs of strain. Making minor adjustments to sleep and screen exposure can bring quick relief."
      };
    }
  }

  function generateRecommendations(payload, score) {
    recsList.innerHTML = "";
    const items = [];

    if (payload.sleep_hours_per_night < 7) {
      items.push({
        icon: "moon",
        colorClass: "rec-blue",
        text: "Try adding 45–60 minutes of sleep. Consistent sleep is the single most effective buffer against academic fatigue."
      });
    }
    if (payload.avg_daily_usage_hours > 5) {
      items.push({
        icon: "smartphone",
        colorClass: "rec-purple",
        text: "Screen time is on the higher side. Consider setting a daily app timer or turning notifications off during study blocks."
      });
    }
    if (payload.physical_activity_hours < 0.5) {
      items.push({
        icon: "activity",
        colorClass: "rec-emerald",
        text: "Aim for a short 15–20 minute walk daily. Mild movement significantly improves focus and calms tension."
      });
    }
    if (payload.stress_level === "High" || payload.stress_level === "Very High") {
      items.push({
        icon: "coffee",
        colorClass: "rec-amber",
        text: "Remember to take real breaks when studying (e.g. 5 minutes away from screens every 50 minutes)."
      });
    }
    if (items.length === 0) {
      items.push({
        icon: "check",
        colorClass: "rec-emerald",
        text: "Your habits look well-rounded. Keep prioritizing regular sleep schedules and outdoor breaks during exam weeks."
      });
    }

    items.slice(0, 3).forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="rec-bullet-icon ${item.colorClass}">
          <i data-lucide="${item.icon}"></i>
        </div>
        <span>${item.text}</span>
      `;
      recsList.appendChild(li);
    });

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function displayResults(score, payload) {
    currentScore = score;
    const clamped = Math.max(0, Math.min(10, score));
    scoreDisplay.textContent = clamped.toFixed(1);

    const details = getScoreDetails(clamped);
    scoreBadge.className = `score-status-badge ${details.badgeClass}`;
    scoreBadge.textContent = details.badgeText;
    scoreSummaryText.textContent = details.summary;

    const scoreBox = document.getElementById("score-box-container");
    if (scoreBox) {
      scoreBox.style.background = details.boxBg;
      scoreBox.style.borderColor = details.borderColor;
    }

    renderChart(payload);
    generateRecommendations(payload, clamped);

    setViewState("result");
  }

  // -------------------------------------------------------------------------
  // 8. Submit Handler & API Call
  // -------------------------------------------------------------------------
  async function onSubmit(e) {
    e.preventDefault();

    const payload = getPayload();
    if (!validate(payload)) {
      showToast("Please check the highlighted fields.");
      return;
    }

    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    setViewState("loading");

    try {
      // First try current origin / local server
      let res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => null);

      // If local server is not serving or failed, try localhost:8000 then Cloud
      if (!res || !res.ok) {
        res = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        res = await fetch(`${CLOUD_API}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => null);
      }

      if (!res) {
        setViewState("error");
        document.getElementById("error-heading").textContent = "Connection Error";
        document.getElementById("error-message").textContent = "Could not reach the prediction service. Please ensure the backend is running.";
        return;
      }

      if (res.status === 422) {
        const errorData = await res.json().catch(() => null);
        if (errorData && Array.isArray(errorData.detail)) {
          errorData.detail.forEach((err) => {
            const field = err.loc[err.loc.length - 1];
            setError(field, err.msg || "Invalid value");
          });
        }
        setViewState("error");
        document.getElementById("error-heading").textContent = "Validation Issue";
        document.getElementById("error-message").textContent = "Some submitted values were rejected. Please review the form.";
        return;
      }

      if (!res.ok) {
        setViewState("error");
        document.getElementById("error-heading").textContent = `Error (${res.status})`;
        document.getElementById("error-message").textContent = "The server could not process your request right now.";
        return;
      }

      const data = await res.json();
      if (typeof data.predicted_mental_health_score !== "number") {
        setViewState("error");
        document.getElementById("error-heading").textContent = "Invalid Response";
        document.getElementById("error-message").textContent = "The model did not return a valid score.";
        return;
      }

      displayResults(data.predicted_mental_health_score, payload);

    } catch (err) {
      setViewState("error");
      document.getElementById("error-heading").textContent = "Unexpected Error";
      document.getElementById("error-message").textContent = err.message || "An unexpected error occurred.";
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  }

  // -------------------------------------------------------------------------
  // 9. Actions & Init
  // -------------------------------------------------------------------------
  function initActions() {
    sampleDataBtn.addEventListener("click", fillSampleData);

    resetBtn.addEventListener("click", () => {
      clearErrors();
      setViewState("idle");
      setTimeout(() => {
        document.getElementById("avg_daily_usage_hours").dispatchEvent(new Event("input"));
        document.getElementById("daily_unlocks").dispatchEvent(new Event("input"));
        document.getElementById("sleep_hours_per_night").dispatchEvent(new Event("input"));
        document.getElementById("study_hours").dispatchEvent(new Event("input"));
        document.getElementById("physical_activity_hours").dispatchEvent(new Event("input"));
      }, 50);
      showToast("Form reset");
    });

    retryBtn.addEventListener("click", () => {
      form.dispatchEvent(new Event("submit"));
    });

    retestBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    copyBtn.addEventListener("click", () => {
      const payload = getPayload();
      const text = `Mental Health Detector — Student Wellness Score: ${currentScore.toFixed(1)}/10\nSleep: ${payload.sleep_hours_per_night}h | Screen: ${payload.avg_daily_usage_hours}h | Study: ${payload.study_hours}h | Stress: ${payload.stress_level}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast("Summary copied to clipboard");
      }).catch(() => {
        showToast("Could not copy to clipboard");
      });
    });

    form.addEventListener("submit", onSubmit);
  }

  function init() {
    initTheme();
    initSliders();
    initActions();

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();