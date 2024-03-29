import express from 'express';
import { validate } from 'express-validation';
import { loginController, registerController } from './auth-controllers.js';
import { authValidation } from './auth-validation.js';

const authRouter = express.Router();

authRouter.use(validate(authValidation, {}, {}));

authRouter.route('/register').post(registerController);
authRouter.route('/login').post(loginController);

export default authRouter;
