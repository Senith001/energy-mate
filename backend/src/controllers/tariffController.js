import { success, error } from "../utils/responseFormatter.js";
import { getTariff, updateTariff } from "../services/tarifService.js";

// GET current tariff
async function viewTariff(req, res) {
  try {
    const tariff = await getTariff();
    return success(res, tariff, "Tariff fetched");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// PUT update tariff - admin only
async function editTariff(req, res) {
  try {
    const { tariffLow, tariffHigh, ssclRate } = req.body;

    const updates = {};
    if (tariffLow) updates.tariffLow = tariffLow;
    if (tariffHigh) updates.tariffHigh = tariffHigh;
    if (ssclRate !== undefined) updates.ssclRate = ssclRate;

    if (Object.keys(updates).length === 0) {
      return error(res, "No valid fields to update", 400);
    }

    const tariff = await updateTariff(updates);
    return success(res, tariff, "Tariff updated");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

export { viewTariff, editTariff };
