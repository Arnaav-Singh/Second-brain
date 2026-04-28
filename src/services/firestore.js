import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Helper to convert Firestore timestamps
export const toFirestoreDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) return Timestamp.fromDate(date);
  if (typeof date === 'string') return Timestamp.fromDate(new Date(date));
  return date;
};

// Projects
export const projectsService = {
  collection: 'projects',

  async getAll(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getActive(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('priority_score', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async create(userId, projectData) {
    const activeProjects = await this.getActive(userId);
    if (projectData.status === 'active' && activeProjects.length >= 3) {
      throw new Error('Maximum 3 active projects allowed');
    }

    return addDoc(collection(db, this.collection), {
      ...projectData,
      userId,
      created_at: Timestamp.now(),
    });
  },

  async update(id, updates) {
    return updateDoc(doc(db, this.collection, id), updates);
  },

  async delete(id) {
    return deleteDoc(doc(db, this.collection, id));
  },
};

// Actions
export const actionsService = {
  collection: 'actions',

  async getAll(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByStatus(userId, status) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('status', '==', status),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async create(userId, actionData) {
    return addDoc(collection(db, this.collection), {
      ...actionData,
      userId,
      created_at: Timestamp.now(),
    });
  },

  async update(id, updates) {
    return updateDoc(doc(db, this.collection, id), updates);
  },

  async delete(id) {
    return deleteDoc(doc(db, this.collection, id));
  },
};

// Tasks
export const tasksService = {
  collection: 'tasks',

  async getAll(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getPending(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('priority', 'desc'),
      orderBy('due_date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async create(userId, taskData) {
    return addDoc(collection(db, this.collection), {
      ...taskData,
      userId,
      status: 'pending',
      created_at: Timestamp.now(),
    });
  },

  async update(id, updates) {
    return updateDoc(doc(db, this.collection, id), updates);
  },

  async delete(id) {
    return deleteDoc(doc(db, this.collection, id));
  },
};

// Timetable Slots
export const timetableService = {
  collection: 'timetable_slots',

  async getAll(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      orderBy('day_of_week', 'asc'),
      orderBy('start_time', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByDay(userId, dayOfWeek) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('day_of_week', '==', dayOfWeek),
      orderBy('start_time', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async create(userId, slotData) {
    return addDoc(collection(db, this.collection), {
      ...slotData,
      userId,
    });
  },

  async update(id, updates) {
    return updateDoc(doc(db, this.collection, id), updates);
  },

  async delete(id) {
    return deleteDoc(doc(db, this.collection, id));
  },
};

// Study Sessions
export const studySessionsService = {
  collection: 'study_sessions',

  async getAll(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByDateRange(userId, startDate, endDate) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('date', '>=', toFirestoreDate(startDate)),
      where('date', '<=', toFirestoreDate(endDate)),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async create(userId, sessionData) {
    return addDoc(collection(db, this.collection), {
      ...sessionData,
      userId,
      date: toFirestoreDate(sessionData.date || new Date()),
    });
  },

  async update(id, updates) {
    return updateDoc(doc(db, this.collection, id), updates);
  },

  async delete(id) {
    return deleteDoc(doc(db, this.collection, id));
  },
};

// Study Settings
export const studySettingsService = {
  collection: 'study_settings',

  async get(userId) {
    const docRef = doc(db, this.collection, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async createOrUpdate(userId, settings) {
    const docRef = doc(db, this.collection, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return updateDoc(docRef, settings);
    } else {
      return setDoc(docRef, {
        userId,
        ...settings,
      });
    }
  },
};

// Energy Days
export const energyDaysService = {
  collection: 'energy_days',

  async getByDate(userId, date) {
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('date', '==', dateStr)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async createOrUpdate(userId, date, energyData) {
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    const existing = await this.getByDate(userId, dateStr);
    if (existing) {
      return updateDoc(doc(db, this.collection, existing.id), energyData);
    } else {
      return addDoc(collection(db, this.collection), {
        userId,
        date: dateStr,
        ...energyData,
      });
    }
  },

  async getRecentDays(userId, daysCount = 7) {
    const dates = [];
    for (let i = 0; i < daysCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('date', 'in', dates.slice(0, 10))
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  calculateEnergyDebt(energyDays) {
    const sortedDays = energyDays.sort((a, b) => new Date(b.date) - new Date(a.date));
    let consecutiveHighDays = 0;

    for (const day of sortedDays) {
      if (day.type === 'deep_work') {
        consecutiveHighDays++;
      } else {
        break;
      }
    }

    return {
      consecutiveHighDays,
      isAtRisk: consecutiveHighDays >= 3,
      severity: consecutiveHighDays >= 5 ? 'high' : consecutiveHighDays >= 3 ? 'medium' : 'low',
      message: consecutiveHighDays >= 5
        ? 'You need rest! 5+ deep work days in a row.'
        : consecutiveHighDays >= 3
          ? 'Consider taking a lighter day soon.'
          : 'Energy levels look healthy.'
    };
  },
};

// Fitness Settings
export const fitnessSettingsService = {
  collection: 'fitness_settings',

  async get(userId) {
    const docRef = doc(db, this.collection, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async createOrUpdate(userId, settings) {
    const docRef = doc(db, this.collection, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return updateDoc(docRef, settings);
    } else {
      return setDoc(docRef, {
        userId,
        ...settings,
      });
    }
  },
};

// Weekly Reviews
export const weeklyReviewsService = {
  collection: 'weekly_reviews',

  async getAll(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      orderBy('week_start', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByWeek(userId, weekStart) {
    const dateStr = weekStart instanceof Date ? weekStart.toISOString().split('T')[0] : weekStart;
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('week_start', '==', dateStr)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async create(userId, reviewData) {
    return addDoc(collection(db, this.collection), {
      ...reviewData,
      userId,
      created_at: Timestamp.now(),
    });
  },

  async update(id, updates) {
    return updateDoc(doc(db, this.collection, id), updates);
  },
};

// Weekly Study Reports
export const weeklyStudyReportsService = {
  collection: 'weekly_study_reports',

  async getAll(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      orderBy('week_start', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByWeek(userId, weekStart) {
    const dateStr = weekStart instanceof Date ? weekStart.toISOString().split('T')[0] : weekStart;
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      where('week_start', '==', dateStr)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async create(userId, reportData) {
    return addDoc(collection(db, this.collection), {
      ...reportData,
      userId,
      created_at: Timestamp.now(),
    });
  },
};

// User Settings (exam mode, etc.)
export const userSettingsService = {
  collection: 'users',

  async get(userId) {
    const docRef = doc(db, this.collection, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async createOrUpdate(userId, settings) {
    const docRef = doc(db, this.collection, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return updateDoc(docRef, settings);
    } else {
      return setDoc(docRef, {
        userId,
        ...settings,
      });
    }
  },
};

// Email Logs
export const emailLogsService = {
  collection: 'email_logs',

  async getAll(userId) {
    const q = query(
      collection(db, this.collection),
      where('userId', '==', userId),
      orderBy('sent_at', 'desc'),
      limit(30)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async create(userId, logData) {
    return addDoc(collection(db, this.collection), {
      ...logData,
      userId,
      sent_at: Timestamp.now(),
    });
  },
};

// Onboarding
export const onboardingService = {
  async getStatus(userId) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          hasCompleted: data.hasCompletedOnboarding || false,
          currentStep: data.onboardingStep || 0,
        };
      }
      return { hasCompleted: false, currentStep: 0 };
    } catch (error) {
      console.error('[Onboarding] Error getting status:', error);
      return { hasCompleted: false, currentStep: 0 };
    }
  },

  async updateStep(userId, step) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, { onboardingStep: step });
      } else {
        // Create user doc if it doesn't exist
        await setDoc(docRef, {
          id: userId,
          onboardingStep: step,
          hasCompletedOnboarding: false,
          created_at: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('[Onboarding] Error updating step:', error);
      throw error;
    }
  },

  async complete(userId) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          hasCompletedOnboarding: true,
          onboardingStep: 11,
        });
      } else {
        await setDoc(docRef, {
          id: userId,
          hasCompletedOnboarding: true,
          onboardingStep: 11,
          created_at: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('[Onboarding] Error completing:', error);
      throw error;
    }
  },

  async reset(userId) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          hasCompletedOnboarding: false,
          onboardingStep: 0,
        });
      }
    } catch (error) {
      console.error('[Onboarding] Error resetting:', error);
    }
  },
};

// Monthly Reset Service
export const resetService = {
  // Check if a reset is needed for the user
  checkResetNeeded(userId) {
    const today = new Date();
    // Check if it's the 1st of the month
    if (today.getDate() !== 1) {
      return false;
    }

    const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`; // e.g., "2024-0" for Jan 2024
    const lastReset = localStorage.getItem(`last_monthly_reset_${userId}`);

    // If we haven't reset for this specific month key yet, we need to
    return lastReset !== currentMonthKey;
  },

  // Mark the current month as reset
  markResetComplete(userId) {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`;
    localStorage.setItem(`last_monthly_reset_${userId}`, currentMonthKey);
  },

  // Perform the destructive reset
  async performMonthlyReset(userId) {
    const collectionsToDelete = [
      'tasks',
      'projects',
      'actions',
      'study_sessions',
      'weekly_reviews',
      'weekly_study_reports',
      'daily_summaries',
      'email_logs',
      'energy_days'
    ];

    try {
      // We process strictly sequentially to avoid overwhelming the client or network
      for (const colName of collectionsToDelete) {
        await this.deleteCollection(userId, colName);
      }
      this.markResetComplete(userId);
      return true;
    } catch (error) {
      console.error('[Reset] Error performing monthly reset:', error);
      throw error;
    }
  },

  // Helper to delete all docs in a collection for a user
  // Uses batch writes for efficiency
  async deleteCollection(userId, collectionName) {
    const q = query(collection(db, collectionName), where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    // Firestore batch limit is 500 operations
    const BATCH_SIZE = 500;
    const chunks = [];

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      chunks.push(snapshot.docs.slice(i, i + BATCH_SIZE));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  }
};
