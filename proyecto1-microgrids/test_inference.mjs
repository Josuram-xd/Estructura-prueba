import * as ort from "onnxruntime-web";
import { readFileSync } from "fs";

const modelBuffer = readFileSync("./solar_model.onnx");
const session = await ort.InferenceSession.create(modelBuffer);

const inputName = session.inputNames[0];
const feeds = {};
feeds[inputName] = new ort.Tensor("float32", Float32Array.from([12, 30]), [1, 2]);

const results = await session.run(feeds);
const outputName = session.outputNames[0];
console.log("TEST_PASSED: inferencia ONNX en Node =", results[outputName].data);
