import Tariff from "../models/tarif.js";

// Original hardcoded values — used as seed data only
const DEFAULT_TARIFF = {
  name: "domestic",
  tariffLow: [
    { upTo: 30,   rate: 4.50,  fixedCharge: 80.00  },
    { upTo: 60,   rate: 8.00,  fixedCharge: 210.00 },
  ],
  tariffHigh: [
    { upTo: 60,   rate: 12.75, fixedCharge: 0       },
    { upTo: 90,   rate: 18.50, fixedCharge: 400.00  },
    { upTo: 120,  rate: 24.00, fixedCharge: 1000.00 },
    { upTo: 180,  rate: 41.00, fixedCharge: 1500.00 },
    { upTo: null, rate: 61.00, fixedCharge: 2100.00 },
  ],
  ssclRate: 0.025,
};

// Read tariff from DB — auto seeds defaults on first run
async function getTariff() {
  let tariff = await Tariff.findOne({ name: "domestic" });
  if (!tariff) {
    // First time — seed with CEB default values
    tariff = await Tariff.create(DEFAULT_TARIFF);
    console.log("Tariff seeded with CEB defaults");
  }
  return tariff;
}

// Admin update tariff (partial update supported)
async function updateTariff(data) {
  const tariff = await Tariff.findOneAndUpdate(
    { name: "domestic" },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );
  return tariff;
}

export { getTariff, updateTariff };