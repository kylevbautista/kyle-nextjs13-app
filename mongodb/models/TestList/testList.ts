import mongoose, { Schema } from "mongoose";

const testListSchema = new Schema({
  testid: { type: String },
});

const TestList = mongoose.model("testList", testListSchema);
export default TestList;
