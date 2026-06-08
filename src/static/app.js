document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to avoid duplicate options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantItems = details.participants.length
          ? details.participants.map((email) =>
              `<li><span class="participant-email">${email}</span><button class="remove-participant" data-email="${email}" data-activity="${name}" title="Remove participant">✖</button></li>`
            ).join("")
          : "<li><em>No participants yet</em></li>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
          <div class="participants-section">
            <strong>Participants</strong>
            <ul class="participants-list">
              ${participantItems}
            </ul>
          </div>
        `;

        // Attach activity name to the card for easy DOM updates
        activityCard.dataset.activity = name;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        	messageDiv.textContent = result.message;
        	messageDiv.className = "message success";
        	signupForm.reset();

        	// Update the DOM for the affected activity without reloading everything
        	const cards = Array.from(activitiesList.querySelectorAll('.activity-card'));
        	const card = cards.find(c => c.dataset.activity === activity);
        	if (card) {
        	  const ul = card.querySelector('.participants-list');
        	  if (ul) {
        	    const li = document.createElement('li');
        	    li.innerHTML = `<span class="participant-email">${email}</span><button class="remove-participant" data-email="${email}" data-activity="${activity}" title="Remove participant">✖</button>`;
        	    ul.appendChild(li);
        	  }
        	  const spots = card.querySelector('.spots-left');
        	  if (spots) {
        	    const count = parseInt(spots.textContent || '0', 10);
        	    spots.textContent = Math.max(0, count - 1);
        	  }
        	}
      } else {
        	messageDiv.textContent = result.detail || "An error occurred";
        	messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
        messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle remove participant button clicks (event delegation)
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".remove-participant");
    if (!btn) return;

    const email = btn.dataset.email;
    const activity = btn.dataset.activity;
    if (!email || !activity) return;

    if (!confirm(`Unregister ${email} from "${activity}"?`)) return;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        // Update DOM: remove participant row and increment spots
        const cards = Array.from(activitiesList.querySelectorAll('.activity-card'));
        const card = cards.find(c => c.dataset.activity === activity);
        if (card) {
          const ul = card.querySelector('.participants-list');
          if (ul) {
            const item = Array.from(ul.querySelectorAll('li')).find(li => li.querySelector('.participant-email')?.textContent === email);
            if (item) ul.removeChild(item);
          }
          const spots = card.querySelector('.spots-left');
          if (spots) {
            const count = parseInt(spots.textContent || '0', 10);
            spots.textContent = count + 1;
          }
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant.";
      messageDiv.className = "message error";
      console.error("Error removing participant:", error);
    } finally {
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    }
  });

  // Initialize app
  fetchActivities();
});
