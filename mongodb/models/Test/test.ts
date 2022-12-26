import mongoose, { Schema } from "mongoose";

const testSchema = new Schema({
  userId: { type: mongoose.Types.ObjectId, required: true },
  name: {
    type: String,
  },
});

const Test = mongoose.model("testModel", testSchema);
export default Test;
