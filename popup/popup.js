console.log("popup page loaded")

const data = [
    [
      ['0.3 L'],     // Eau
      ['2 kg'],   // CO₂
      ['1 kWh']      // Électricité
    ],
    [
      ['1.5 L'],
      ['10 kg'],
      ['4 kWh']
    ],
    [
      ['25 L'],
      ['150 kg'],
      ['30 kWh']
    ]
  ];

  const score = [
  "2 256",
  "7 651",
  "99 666"
  ]
  

  async function showTab(index) {
    const dataused = ["LAST_PROMPT", "CONV", "LAST_30_DAYS"];
  
    const table = document.getElementById("impact-table").getElementsByTagName("tbody")[0];
    const buttons = document.querySelectorAll(".tab-button");
    const response = await fetch('./eq.json');
    const equivalences = await response.json();
    const labels = ["Eau", "CO₂", "Électricité"];
  
    // Gérer le cas particulier pour LAST_30_DAYS
    if (index === 2) {
      document.getElementById("score-title").textContent = "Score : Donnée indisponible";
      table.innerHTML = "";
  
      for (let i = 0; i < labels.length; i++) {
        const row = `<tr>
          <td class='row-label'>${labels[i]}</td>
          <td>-</td>
          <td>Donnée indisponible</td>
        </tr>`;
        table.innerHTML += row;
      }
  
      buttons.forEach((btn, i) => {
        btn.classList.toggle("active", i === index);
      });
  
      return; // ne continue pas plus loin
    }

    if (index === 1) {
        const scorec = 136;
        const co2ec = scorec * 2; // ~2g CO₂e par point
        const electricitec = scorec * 0.01; // ~0.01 Wh par point
        const eauc = scorec * 0.3; // ~0.3 L par point

        const convp = {
            score: scorec,
            eau: eauc,
            electricite: electricitec,
            co2e: co2ec
        } 
        chrome.storage.local.set({ CONV: convp })
    }
    chrome.storage.local.get([dataused[index]], (result) => {
      const data = result[dataused[index]];
  
      if (data) {
        try {
          const co2e = data.co2e;
          const eau = data.eau;
          const electricite = data.electricite;
          const score = data.score;
  
          console.log("CO₂ :", co2e);
          console.log("Eau :", eau);
          console.log("Électricité :", electricite);
          console.log("Score :", score);
  
          document.getElementById("score-title").textContent = "Score : " + score;
          const values = [eau, co2e, electricite]; // Eau, CO₂, Électricité
          table.innerHTML = "";
  
          for (let i = 0; i < 3; i++) {
            const raw = values[i].toString(); // s'assurer que c'est une string
            const match = raw.trim().match(/^([\d.]+)\s*([a-zA-Z]*)$/);
  
            if (!match) {
              table.innerHTML += `<tr><td>${labels[i]}</td><td>${raw}</td><td>Format invalide</td></tr>`;
              continue;
            }
  
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase() || (i === 0 ? "l" : i === 1 ? "g" : "kwh");
  
            const list = equivalences
              .filter(eq => eq.unit.toLowerCase() === unit)
              .sort((a, b) => b.value - a.value);
  
            let equivalent = "Pas d’équivalence disponible";
  
            for (const eq of list) {
              const ratio = value / eq.value;
              if (ratio >= 1) {
                const rounded = Math.round(ratio * 10) / 10;
                equivalent = (rounded === 1)
                  ? `≈ ${eq.description}`
                  : `≈ ${rounded}× ${eq.description}`;
                break;
              }
            }
  
            if (equivalent === "Pas d’équivalence disponible" && list.length > 0) {
              const smallest = list[list.length - 1];
              const percent = Math.round((value / smallest.value) * 100);
              equivalent = `≈ ${percent}% de ${smallest.description}`;
            }
  
            const row = `<tr>
              <td class='row-label'>${labels[i]}</td>
              <td>${raw} ${unit}</td>
              <td>${equivalent}</td>
            </tr>`;
            table.innerHTML += row;
          }
  
        } catch (e) {
          console.error("Erreur lors de l'utilisation des données :", e);
        }
      } else {
        console.warn("Aucune donnée trouvée pour", dataused[index]);
      }
    });
  
    buttons.forEach((btn, i) => {
      btn.classList.toggle("active", i === index);
    });
  }
  
  
  

    window.addEventListener("DOMContentLoaded", () => showTab(0));
    
    document.addEventListener("DOMContentLoaded", () => {
        const buttons = document.querySelectorAll(".tab-button");
        buttons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const index = parseInt(btn.getAttribute("data-index"), 10);
            showTab(index);
          });
        });
      
        showTab(0);
      });