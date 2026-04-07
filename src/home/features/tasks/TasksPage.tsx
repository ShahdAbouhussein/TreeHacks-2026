import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { db } from "../../../lib/firebase";
import { TaskListItem } from "./TaskListItem";
import { InlineDatePicker } from "@/components/InlineDatePicker";

type Tab = "tasks" | "projects";

const snappySpring = { type: "spring" as const, stiffness: 350, damping: 30, mass: 1 };

interface Task {
  id: string;
  title: string;
  dueDate: string;
  description: string;
  tag: string;
  category: string;
  completed: boolean;
  urgent?: boolean;
  projectId?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  deadline: string;
  estimatedHours: number;
  status: string;
}

interface TasksPageProps {
  onBack: () => void;
  userId: string;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`;
}

export default function TasksPage({ onBack, userId }: TasksPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  // Editing state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editHours, setEditHours] = useState(0);

  // Accordion state for tasks tab project groups
  const [expandedProjectInTasks, setExpandedProjectInTasks] = useState<string | null>(null);

  // Fetch all tasks (including completed for progress)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users", userId, "tasks"),
      (snapshot) => {
        const fetched: Task[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Task, "id">),
        }));
        setTasks(fetched);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  // Fetch projects
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users", userId, "projects"),
      (snapshot) => {
        const fetched: Project[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Project, "id">),
        }));
        setProjects(fetched);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  // Group tasks by projectId
  useEffect(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.projectId) {
        if (!grouped[t.projectId]) grouped[t.projectId] = [];
        grouped[t.projectId].push(t);
      }
    });
    setProjectTasks(grouped);
  }, [tasks]);

  // Sync edit fields when selecting a project
  useEffect(() => {
    if (selectedProjectId) {
      const p = projects.find((pr) => pr.id === selectedProjectId);
      if (p) {
        setEditTitle(p.title);
        setEditDescription(p.description);
        setEditDeadline(p.deadline);
        setEditHours(p.estimatedHours);
      }
      setIsEditing(false);
      setShowDeadlinePicker(false);
    }
  }, [selectedProjectId, projects]);

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const standaloneTasks = incompleteTasks.filter((t) => !t.projectId);
  const urgentTasks = standaloneTasks.filter((t) => t.urgent);
  const otherTasks = standaloneTasks.filter((t) => !t.urgent);

  // Projects that have incomplete tasks (for the tasks tab)
  const projectsWithTasks = projects.filter((p) => {
    const pTasks = projectTasks[p.id] || [];
    return pTasks.some((t) => !t.completed);
  });

  const dismissTask = async (taskId: string) => {
    await deleteDoc(doc(db, "users", userId, "tasks", taskId));
  };

  const completeTask = async (taskId: string) => {
    await updateDoc(doc(db, "users", userId, "tasks", taskId), { completed: true });
  };

  const toggleUrgent = async (taskId: string, currentUrgent?: boolean) => {
    await updateDoc(doc(db, "users", userId, "tasks", taskId), { urgent: !currentUrgent });
  };

  const saveProject = async () => {
    if (!selectedProjectId) return;
    const oldProject = projects.find((p) => p.id === selectedProjectId);
    const deadlineChanged = oldProject && oldProject.deadline !== editDeadline;

    await updateDoc(doc(db, "users", userId, "projects", selectedProjectId), {
      title: editTitle,
      description: editDescription,
      deadline: editDeadline,
      estimatedHours: editHours,
    });
    setIsEditing(false);

    // If deadline changed, redistribute incomplete tasks across new date range
    if (deadlineChanged) {
      const pTasks = (projectTasks[selectedProjectId] || []).filter((t) => !t.completed);
      if (pTasks.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newDeadline = new Date(editDeadline + "T00:00:00");
      const totalDays = Math.max(1, Math.round((newDeadline.getTime() - today.getTime()) / 86400000));
      const tasksPerDay = Math.ceil(pTasks.length / totalDays);

      const sorted = [...pTasks].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
      for (let i = 0; i < sorted.length; i++) {
        const dayOffset = Math.min(Math.floor(i / tasksPerDay), totalDays - 1);
        const newDate = new Date(today);
        newDate.setDate(newDate.getDate() + dayOffset);
        const dateStr = newDate.toLocaleDateString("en-CA");
        await updateDoc(doc(db, "users", userId, "tasks", sorted[i].id), {
          dueDate: dateStr,
          scheduledDate: dateStr,
        });
      }
    }
  };

  const deleteProject = async (projectId: string) => {
    const pTasks = projectTasks[projectId] || [];
    for (const t of pTasks) {
      await deleteDoc(doc(db, "users", userId, "tasks", t.id));
    }
    await deleteDoc(doc(db, "users", userId, "projects", projectId));
    if (selectedProjectId === projectId) setSelectedProjectId(null);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const selectedTasks = selectedProjectId ? (projectTasks[selectedProjectId] || []).filter((t) => !t.completed) : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "tasks", label: "Tasks" },
    { id: "projects", label: "Projects" },
  ];

  return (
    <div className="relative mx-auto max-w-[402px] lg:max-w-none bg-background lg:flex min-h-screen">
      {/* Left: main content */}
      <div className="flex-1 min-w-0 lg:px-8">
        {/* Back button - mobile only */}
        <div className="px-lg pt-[52px] lg:hidden">
          <button type="button" onClick={onBack} className="flex items-center gap-[6px] text-body leading-body text-text-strong">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
        </div>

        {/* Mobile header */}
        <div className="lg:hidden">
          <h1 className="mt-md text-center font-serif text-display leading-display tracking-[-0.3px] text-text-strong">Tasks</h1>
          <div className="mt-lg px-lg">
            <LayoutGroup>
              <div className="flex rounded-[10px] bg-subtle-fill p-[3px]">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setSelectedProjectId(null); }} className="relative flex-1 rounded-[8px] py-[6px] text-center text-body leading-body outline-none">
                      {isActive && <motion.div layoutId="seg-mobile" className="absolute inset-0 rounded-[8px] bg-surface shadow-subtle" transition={snappySpring} />}
                      <span className={`relative z-10 ${isActive ? "text-text-strong font-medium" : "text-text-secondary"}`}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex lg:items-center lg:justify-between lg:pt-8">
          <h1 className="font-serif text-display leading-display lg:text-heading lg:leading-heading tracking-[-0.3px] text-text-strong">Tasks</h1>
          <LayoutGroup>
            <div className="flex rounded-[10px] bg-subtle-fill p-[3px]">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setSelectedProjectId(null); }} className="relative rounded-[8px] px-4 py-[5px] text-small leading-small outline-none">
                    {isActive && <motion.div layoutId="seg-desktop" className="absolute inset-0 rounded-[8px] bg-surface shadow-subtle" transition={snappySpring} />}
                    <span className={`relative z-10 ${isActive ? "text-text-strong font-medium" : "text-text-secondary"}`}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "tasks" && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mt-xl flex flex-col gap-md px-lg lg:px-0 pb-32"
            >
              {standaloneTasks.length === 0 && projectsWithTasks.length === 0 ? (
                <p className="py-5xl text-center text-body leading-body text-text-tertiary">No tasks yet.</p>
              ) : (
                <>
                  {/* Urgent tasks */}
                  {urgentTasks.length > 0 && (
                    <div className="flex flex-col gap-md">
                      <p className="text-label leading-label font-medium uppercase tracking-wide text-red-500">Urgent</p>
                      {urgentTasks.map((task) => (
                        <TaskListItem key={task.id} title={task.title} dueDate={task.dueDate} description={task.description} urgent onDismiss={() => dismissTask(task.id)} onToggleUrgent={() => toggleUrgent(task.id, true)} />
                      ))}
                    </div>
                  )}

                  {/* Other standalone tasks */}
                  {otherTasks.length > 0 && (
                    <div className="flex flex-col gap-md">
                      {urgentTasks.length > 0 && <p className="mt-2 text-label leading-label font-medium uppercase tracking-wide text-text-tertiary">Other</p>}
                      {otherTasks.map((task) => (
                        <TaskListItem key={task.id} title={task.title} dueDate={task.dueDate} description={task.description} onDismiss={() => dismissTask(task.id)} onToggleUrgent={() => toggleUrgent(task.id, false)} />
                      ))}
                    </div>
                  )}

                  {/* Project task groups (accordion) */}
                  {projectsWithTasks.length > 0 && (
                    <div className="flex flex-col gap-md mt-2">
                      {(standaloneTasks.length > 0) && (
                        <p className="text-label leading-label font-medium uppercase tracking-wide text-text-tertiary">Projects</p>
                      )}
                      {projectsWithTasks.map((project) => {
                        const allPTasks = projectTasks[project.id] || [];
                        const pTasks = allPTasks.filter((t) => !t.completed);
                        const completedCount = allPTasks.filter((t) => t.completed).length;
                        const isExpanded = expandedProjectInTasks === project.id;
                        return (
                          <div key={project.id}>
                            <button
                              type="button"
                              onClick={() => setExpandedProjectInTasks(isExpanded ? null : project.id)}
                              className="flex w-full items-center justify-between rounded-[14px] bg-surface px-4 py-3 text-left transition-colors hover:bg-subtle-fill"
                              style={{ border: "1px solid rgba(150,150,150,0.15)" }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-body leading-body font-medium text-text-strong">{project.title}</span>
                                  <span className="text-caption leading-caption text-text-tertiary">{pTasks.length} tasks remaining</span>
                                </div>
                                {allPTasks.length > 0 && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 max-w-[200px] rounded-full bg-gray-100 overflow-hidden">
                                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(completedCount / allPTasks.length) * 100}%` }} />
                                    </div>
                                    <span className="text-label leading-label text-text-tertiary">{completedCount}/{allPTasks.length}</span>
                                  </div>
                                )}
                              </div>
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`shrink-0 text-text-tertiary transition-transform ml-3 ${isExpanded ? "rotate-180" : ""}`}>
                                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <AnimatePresence>
                              {isExpanded && pTasks.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-md mt-sm flex flex-col gap-sm border-l-2 border-accent/20 pl-md">
                                    {pTasks.map((task) => (
                                      <div key={task.id} className="group flex items-start gap-sm rounded-[12px] bg-surface-alt px-lg py-md">
                                        <button
                                          onClick={() => completeTask(task.id)}
                                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-divider hover:border-accent hover:bg-accent/10 transition-colors"
                                        >
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-40 transition-opacity"><path d="M20 6L9 17l-5-5" /></svg>
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-body leading-body font-medium text-text-strong">{task.title}</p>
                                          <p className="mt-xs text-caption leading-caption text-text-secondary">Due {task.dueDate}</p>
                                        </div>
                                        <button
                                          onClick={() => dismissTask(task.id)}
                                          className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                                        >
                                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3L9 9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === "projects" && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mt-xl flex flex-col pb-32"
            >
              {projects.length === 0 ? (
                <p className="py-5xl text-center text-body leading-body text-text-tertiary px-lg">No projects yet. Use the Assistant to create one.</p>
              ) : (
                projects.map((project) => {
                  const pTasks = projectTasks[project.id] || [];
                  const incompletePTasks = pTasks.filter((t) => !t.completed);
                  const completedCount = pTasks.filter((t) => t.completed).length;
                  const isSelected = selectedProjectId === project.id;

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(isSelected ? null : project.id)}
                      className="flex w-full items-start justify-between px-lg lg:px-0 py-4 text-left transition-colors border-b border-divider hover:bg-subtle-fill/50"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-body leading-body font-medium text-text-strong">{project.title}</h3>
                        <span className="mt-[3px] block text-caption leading-caption text-accent">Due {formatDate(project.deadline)}</span>
                        {pTasks.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 max-w-[200px] rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(completedCount / pTasks.length) * 100}%` }} />
                            </div>
                            <span className="text-label leading-label text-text-tertiary">{completedCount}/{pTasks.length}</span>
                          </div>
                        )}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-3 mt-1 shrink-0 text-text-tertiary" style={{ transform: "rotate(-45deg)" }}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Project detail panel (desktop) */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            key="project-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "420px", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="hidden lg:flex flex-col shrink-0 border-l border-divider bg-white overflow-hidden"
            style={{ height: "100vh", position: "sticky", top: 0 }}
          >
            <div className="flex-1 overflow-y-auto p-6">
              {/* Header: title + edit/close icons */}
              <div className="flex items-start justify-between mb-2">
                {isEditing ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-title leading-title font-medium text-text-strong bg-transparent outline-none border-b border-accent/40 pb-1 mr-2"
                    autoFocus
                  />
                ) : (
                  <h2 className="flex-1 text-title leading-title font-medium text-text-strong">{selectedProject.title}</h2>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      if (isEditing) saveProject();
                      else setIsEditing(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-subtle-fill transition-colors"
                    title={isEditing ? "Save" : "Edit"}
                  >
                    {isEditing ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F8F7A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedProjectId(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-subtle-fill transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {/* Details — read-only or editable */}
              {isEditing ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-label leading-label font-medium text-text-tertiary uppercase tracking-wide">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-[12px] border border-divider bg-background px-4 py-2.5 text-body leading-body text-text-strong outline-none focus:border-accent/40"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <label className="text-label leading-label font-medium text-text-tertiary uppercase tracking-wide">Deadline</label>
                      <button
                        type="button"
                        onClick={() => setShowDeadlinePicker(!showDeadlinePicker)}
                        className="mt-1 flex w-full items-center gap-2 rounded-[12px] border border-divider bg-background px-4 py-2.5 text-body leading-body text-text-strong hover:border-accent/40 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" /></svg>
                        {formatDate(editDeadline) || "Select date"}
                      </button>
                      <AnimatePresence>
                        {showDeadlinePicker && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-full z-[60] mt-1"
                          >
                            <InlineDatePicker value={editDeadline} onChange={(d) => { setEditDeadline(d); setShowDeadlinePicker(false); }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="w-[100px]">
                      <label className="text-label leading-label font-medium text-text-tertiary uppercase tracking-wide">Hours</label>
                      <input
                        type="number"
                        value={editHours}
                        onChange={(e) => setEditHours(Number(e.target.value))}
                        className="mt-1 w-full rounded-[12px] border border-divider bg-background px-4 py-2.5 text-body leading-body text-text-strong outline-none focus:border-accent/40"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  {selectedProject.description && (
                    <p className="text-caption leading-caption text-text-secondary">{selectedProject.description}</p>
                  )}
                  <div className="mt-6 flex flex-wrap items-center gap-2 text-caption leading-caption">
                    <span className="text-accent">Due {formatDate(selectedProject.deadline)}</span>
                    <span className="text-text-tertiary">·</span>
                    <span className="text-text-tertiary">~{selectedProject.estimatedHours}h</span>
                  </div>
                </div>
              )}

              {/* Tasks list */}
              <div>
                <p className="text-label leading-label font-medium text-text-tertiary uppercase tracking-wide mb-3">
                  Tasks ({selectedTasks.length})
                </p>
                <div className="space-y-2">
                  {selectedTasks.map((task) => (
                    <div key={task.id} className="rounded-[12px] bg-background px-4 py-3 group flex items-start gap-3">
                      <button
                        onClick={() => completeTask(task.id)}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-divider hover:border-accent hover:bg-accent/10 transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-40 transition-opacity"><path d="M20 6L9 17l-5-5" /></svg>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-body leading-body font-medium text-text-strong">{task.title}</p>
                        <p className="mt-xs text-caption leading-caption text-text-secondary">{task.dueDate}</p>
                      </div>
                      <button
                        onClick={() => dismissTask(task.id)}
                        className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3L9 9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  ))}
                  {selectedTasks.length === 0 && (
                    <p className="text-caption leading-caption text-text-tertiary py-3">All tasks completed!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom actions */}
            <div className="shrink-0 border-t border-divider px-6 py-4">
              <button
                onClick={() => deleteProject(selectedProject.id)}
                className="text-small leading-small font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                Delete project
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: Project detail bottom sheet */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            key="project-mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setSelectedProjectId(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[20px] bg-white p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title leading-title font-medium text-text-strong">{selectedProject.title}</h2>
                <button onClick={() => setSelectedProjectId(null)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-subtle-fill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              {selectedProject.description && <p className="text-body leading-body text-text-secondary mb-1">{selectedProject.description}</p>}
              <p className="text-caption leading-caption text-text-tertiary mb-4">Due {formatDate(selectedProject.deadline)} · ~{selectedProject.estimatedHours}h</p>

              <div className="space-y-2">
                {selectedTasks.map((task) => (
                  <TaskListItem key={task.id} title={task.title} dueDate={task.dueDate} description={task.description} urgent={task.urgent} onDismiss={() => dismissTask(task.id)} onToggleUrgent={() => toggleUrgent(task.id, task.urgent)} />
                ))}
              </div>

              <button onClick={() => deleteProject(selectedProject.id)} className="mt-4 w-full rounded-[12px] py-3 text-body leading-body font-medium text-red-500 hover:bg-red-50 transition-colors">
                Delete project
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
