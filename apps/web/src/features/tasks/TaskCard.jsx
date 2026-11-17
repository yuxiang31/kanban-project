/**
 * @param {{task: !Object, onOpen: function()}} props
 */
export default function TaskCard({task, onOpen}) {
  return (
    <button
      type="button"
      className="task-card"
      aria-label={`Open task ${task.title}`}
      onClick={onOpen}
    >
      {task.title}
    </button>
  );
}
