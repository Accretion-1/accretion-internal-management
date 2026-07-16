import app from "./app.js";
import { PORT } from "./constants.js";
import { connectDB } from "./config/db.js";
import { startTodoReminderCron } from "./services/todoReminder.cron.js";
import { startGodownSlipsCron } from "./services/godown_slips_cron.js";
import { startGodownMasterDataSyncCron } from "./services/godownMasterDataSync.cron.js";

connectDB()
  .then(() => {
    startTodoReminderCron();
    startGodownSlipsCron();
    startGodownMasterDataSyncCron();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server due to DB error:", err.message);
    process.exit(1);
  });
