import { RequestHandler } from 'express';
import { CustomHTTPError } from '../../errors/custom-http-error.js';
import {
  RequestParamsUserId,
  RequestQueryOffsetLimit,
  UserLocalsId,
} from '../../types/models.js';
import { PostModel } from '../posts/posts-schema.js';
import { UserModel } from './users-schema.js';

export const getUserByIdController: RequestHandler<
  RequestParamsUserId,
  unknown,
  unknown,
  unknown,
  UserLocalsId
> = async (req, res, next) => {
  const user = req.params.idUser;
  const userRequesting = res.locals.id;

  try {
    const userData = await UserModel.findOne({ _id: user })
      .select('-password')
      .populate({ path: 'favGames', select: 'name banner' })
      .exec();

    if (userData === null) {
      throw new CustomHTTPError(404, 'User not found');
    }

    const userProfile = {
      _id: userData._id,
      username: userData.username,
      name: userData.name,
      surname: userData.surname,
      avatar: userData.avatar,
      biography: userData.biography,
      favGames: userData.favGames,
    };

    const userRequestingIsFollower = userData.followers
      .toString()
      .includes(userRequesting);

    return res.status(200).json({
      msg: 'Successfully fetched user!',
      user: userProfile,
      userFollowersCount: userData.followers.length,
      userFollowingCount: userData.following.length,
      isFollower: userRequestingIsFollower,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserPostsByIdController: RequestHandler<
  RequestParamsUserId,
  unknown,
  unknown,
  RequestQueryOffsetLimit
> = async (req, res, next) => {
  const { idUser } = req.params;
  const { offset, limit } = req.query;

  try {
    const postsCount = await PostModel.countDocuments({ user: idUser }).exec();

    const posts = await PostModel.find({ user: idUser })
      .sort({ date: -1 })
      .limit(limit)
      .skip(offset)
      .populate({ path: 'user', select: 'username name surname avatar' })
      .populate({ path: 'game', select: 'name banner' })
      .exec();
    if (posts === null) {
      throw new CustomHTTPError(404, 'User posts not found');
    }

    return res
      .status(200)
      .json({ msg: 'Successfully fetched posts!', count: postsCount, posts });
  } catch (err) {
    next(err);
  }
};

export const addFollowerController: RequestHandler<
  RequestParamsUserId,
  unknown,
  unknown,
  unknown,
  UserLocalsId
> = async (req, res, next) => {
  const { idUser } = req.params;
  const { id } = res.locals;

  try {
    if (idUser === id) {
      throw new CustomHTTPError(409, 'Cannot follow yourself');
    }

    const alreadyFollower = await UserModel.findOne({
      _id: id,
      following: idUser,
    }).exec();
    if (alreadyFollower !== null) {
      throw new CustomHTTPError(409, 'Already following');
    }

    const newFollower = await UserModel.updateOne(
      { _id: idUser },
      { $push: { followers: id } },
    ).exec();
    const newFollowing = await UserModel.updateOne(
      { _id: id },
      { $push: { following: idUser } },
    ).exec();
    if (newFollower.modifiedCount === 0 || newFollowing.modifiedCount === 0) {
      throw new CustomHTTPError(500, 'Something went wrong');
    }

    return res.status(200).json({
      msg: 'Successfully followed user',
      newFollower: idUser,
      newFollowing: id,
    });
  } catch (err) {
    next(err);
  }
};

export const removeFollowerController: RequestHandler<
  RequestParamsUserId,
  unknown,
  unknown,
  unknown,
  UserLocalsId
> = async (req, res, next) => {
  const { idUser } = req.params;
  const { id } = res.locals;

  try {
    const notFollowing = await UserModel.findOne({
      _id: id,
      following: idUser,
    }).exec();
    if (notFollowing === null) {
      throw new CustomHTTPError(404, 'Not following');
    }

    await UserModel.updateOne(
      { _id: idUser },
      { $pull: { followers: id } },
    ).exec();

    await UserModel.updateOne(
      { _id: id },
      { $pull: { following: idUser } },
    ).exec();

    return res.status(200).json({
      msg: 'Successfully unfollowed user',
      removedFollower: idUser,
      removedFollowing: id,
    });
  } catch (err) {
    next(err);
  }
};
