import dayjs from 'dayjs';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { habitModel } from '../models/habit.model.js';
import { buildValidationErrorMessage } from '../utils/build-validation-error-message.utils.js';
export class HabitsController {
  store = async (req: Request, res: Response): Promise<Response> => {
    const schema = z.object({
      name: z.string(),
    });

    const habit = schema.safeParse(req.body);

    if (!habit.success) {
      const errors = buildValidationErrorMessage(habit.error.issues);
      return res.status(422).json({ message: errors });
    }

    const existingHabit = await habitModel.findOne({
      name: habit.data.name,
    });

    if (existingHabit) {
      return res.status(400).json({ message: 'This habit already exists!' });
    }

    const newHabits = await habitModel.create({
      name: habit.data.name,
      completedDates: [],
      userId: req.user.id,
    });

    return res.status(201).json(newHabits);
  };
  index = async (req: Request, res: Response) => {
    const habits = await habitModel
      .find({
        userId: req.user.id,
      })
      .sort({ name: 1 });

    return res.status(200).json(habits);
  };

  remove = async (req: Request, res: Response) => {
    const schema = z.object({
      id: z.string(),
    });

    const habit = schema.safeParse(req.params);

    if (!habit.success) {
      const errors = buildValidationErrorMessage(habit.error.issues);
      return res.status(422).json({ message: errors });
    }

    const existingHabit = await habitModel.findOne({
      _id: habit.data.id,
      userId: req.user.id,
    });

    if (!existingHabit) {
      return res.status(404).json({ message: 'Habit not found!' });
    }

    await habitModel.deleteOne({
      _id: habit.data.id,
    });

    return res.status(204).send();
  };

  toggle = async (req: Request, res: Response) => {
    const schema = z.object({
      id: z.string(),
    });

    const validatedHabit = schema.safeParse(req.params);

    if (!validatedHabit.success) {
      const errors = buildValidationErrorMessage(validatedHabit.error.issues);
      return res.status(422).json({ message: errors });
    }

    const existingHabit = await habitModel.findOne({
      _id: validatedHabit.data.id,
      userId: req.user.id,
    });

    if (!existingHabit) {
      return res.status(404).json({ message: 'Habit not found!' });
    }

    const now = dayjs().startOf('day').toISOString();

    const isHabitCompletedOnDate = existingHabit
      .toObject()
      .completedDates.find((item) => dayjs(String(item)).toISOString() === now);

    if (isHabitCompletedOnDate) {
      const habitUpdated = await habitModel.findOneAndUpdate(
        {
          _id: validatedHabit.data.id,
          userId: req.user.id,
        },
        {
          $pull: {
            completedDates: now,
          },
        },
        {
          returnDocument: 'after',
        },
      );
      return res.status(200).json(habitUpdated);
    }

    const habitUpdated = await habitModel.findOneAndUpdate(
      {
        _id: validatedHabit.data.id,
        userId: req.user.id,
      },
      {
        $push: {
          completedDates: now,
        },
      },
      {
        returnDocument: 'after',
      },
    );
    return res.status(200).json(habitUpdated);
  };

  metrics = async (req: Request, res: Response) => {
    const schema = z.object({
      id: z.string(),
      date: z.coerce.date(),
    });

    const validated = schema.safeParse({
      ...req.params,
      ...req.query,
    });

    if (!validated.success) {
      const errors = buildValidationErrorMessage(validated.error.issues);
      return res.status(422).json({ message: errors });
    }

    const dateFrom = dayjs(validated.data.date).startOf('month');
    const dateTo = dayjs(validated.data.date).endOf('month');

    const [habitMetrics] = await habitModel
      .aggregate()
      .match({
        _id: new mongoose.Types.ObjectId(validated.data.id),
        userId: req.user.id,
      })
      .project({
        _id: 1,
        name: 1,
        completedDates: {
          $filter: {
            input: '$completedDates',
            as: 'completedDate',
            cond: {
              $and: [
                {
                  $gte: ['$$completedDate', dateFrom.toDate()],
                },
                {
                  $lte: ['$$completedDate', dateTo.toDate()],
                },
              ],
            },
          },
        },
      });

    if (!habitMetrics) {
      return res.status(404).json({ message: 'Habit not found!' });
    }
    console.log(habitMetrics);
    return res.status(200).json(habitMetrics);
  };
}
