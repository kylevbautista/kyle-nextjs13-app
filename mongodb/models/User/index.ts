import mongoose, { Schema } from "mongoose";
import AnimeInfoModel from "../../models/AnimeInfo";

const userSchema = new Schema({
  _id: { type: mongoose.Types.ObjectId },
  name: {
    type: String,
  },
  email: { type: String },
  image: { type: String },
  emailVerified: { type: String },
  following: [AnimeInfoModel.schema],
});

// const User = mongoose.model("users", userSchema);
// export default User;

/**
 * Using GraphQL Playground causing some schema redfinitions.
 * Code Below is to handle this case.
 */
let User: any;
try {
  User = mongoose.model("users");
} catch (error) {
  User = mongoose.model("users", userSchema);
}

export default User;
