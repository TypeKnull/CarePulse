"""Generate CarePulse-themed, explicitly synthetic Plotly figures and a PDF report."""
from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from plotly.subplots import make_subplots
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
FIGURES = OUT / "figures"
CYAN, TEAL, GREEN, BLUE = "#0891B2", "#0E7490", "#10B981", "#3B82F6"
SLATE, MUTED, GRID, BG = "#0F172A", "#475569", "#E2E8F0", "#F8FAFC"
FONT = "Arial"


def save_static_fallback(path: Path, draw):
    """Render a matching 2400x1600 static fallback when Kaleido cannot start a browser.

    Kaleido was attempted here but its browser subprocess stalls in this Windows
    execution environment, so the reliable static fallback is Matplotlib rendering.
    The interactive Plotly figures remain in the source and retain their interactions.
    """
    fig = plt.figure(figsize=(12, 8), facecolor="white")
    draw(fig)
    fig.tight_layout()
    fig.savefig(path, dpi=200, facecolor="white")
    plt.close(fig)


def draw_scatter_fallback(fig, plot):
    ax=fig.add_subplot(111,projection="3d")
    for label,color,name in [(0,"#22D3EE","Synthetic label 0"),(1,"#D97706","Synthetic label 1")]:
        part=plot[plot.simulated_outcome==label]
        ax.scatter(part.age,part.bmi,part.fasting_glucose,c=color,s=12,alpha=.58,label=name,depthshade=False)
    ax.set(xlabel="Age (years)",ylabel="BMI (kg/m²)",zlabel="Fasting glucose (mg/dL)")
    ax.xaxis.labelpad=8; ax.yaxis.labelpad=8; ax.zaxis.labelpad=8
    ax.view_init(elev=24,azim=38); ax.legend(loc="upper left",frameon=True)
    ax.set_title("Metabolic Profile — 3D Cohort View\nSynthetic cohort • color marks simulator-generated label",loc="left",pad=20,color=SLATE)
    ax.text2D(.99,1.12,"CAREPULSE  •  SYNTHETIC COHORT",transform=ax.transAxes,ha="right",color=TEAL,fontsize=9)


def draw_surface_fallback(fig, xx, yy, zz):
    ax=fig.add_subplot(111,projection="3d")
    cp_cmap=LinearSegmentedColormap.from_list("carepulse",["#ECFEFF","#22D3EE","#0891B2","#10B981"])
    surf=ax.plot_surface(xx,yy,zz,cmap=cp_cmap,linewidth=0,antialiased=True,alpha=.96)
    ax.set(xlabel="Fasting glucose (mg/dL)",ylabel="BMI (kg/m²)",zlabel="Simulator probability (%)")
    ax.xaxis.labelpad=8; ax.yaxis.labelpad=8; ax.zaxis.labelpad=8
    ax.view_init(elev=28,azim=-135)
    ax.set_title("Synthetic Risk Equation — Response Surface\nEquation output; remaining inputs fixed at cohort medians",loc="left",pad=20,color=SLATE)
    fig.colorbar(surf,ax=ax,shrink=.63,pad=.1,label="Simulator probability (%)")
    ax.text2D(.99,1.12,"CAREPULSE  •  SYNTHETIC COHORT",transform=ax.transAxes,ha="right",color=TEAL,fontsize=9)


def draw_heatmap_fallback(fig, corr, labels):
    ax=fig.add_subplot(111)
    cp_cmap=LinearSegmentedColormap.from_list("carepulse_corr",["#0E7490","#FFFFFF","#D97706"])
    im=ax.imshow(corr.values,cmap=cp_cmap,vmin=-1,vmax=1)
    ax.set_xticks(range(len(labels)),labels,rotation=24,ha="right"); ax.set_yticks(range(len(labels)),labels)
    for i in range(len(labels)):
        for j in range(len(labels)):
            ax.text(j,i,f"{corr.values[i,j]:.2f}",ha="center",va="center",color=SLATE,fontsize=11)
    ax.set_title("Synthetic Cohort — Feature Correlation\nPearson correlations; association does not imply causation",loc="left",pad=18,color=SLATE)
    fig.colorbar(im,ax=ax,shrink=.82,label="Pearson r")


def draw_parallel_fallback(fig, sample, labels, color_values):
    ax=fig.add_subplot(111)
    cmap=LinearSegmentedColormap.from_list("carepulse_parallel",["#22D3EE","#0891B2","#10B981"])
    scaled=(color_values-color_values.min())/(color_values.max()-color_values.min()+1e-9)
    values=sample.to_numpy(dtype=float)
    ranges=np.ptp(values,axis=0)
    normalized=(values-values.min(axis=0))/(np.where(ranges==0,1,ranges))
    for row,c in zip(normalized,scaled):
        ax.plot(range(len(labels)),row,color=cmap(c),alpha=.22,lw=.8)
    ax.set_xticks(range(len(labels)),labels,rotation=24,ha="right")
    ax.set_xlim(0,len(labels)-1); ax.set_ylim(0,1); ax.set_ylabel("Within-feature min–max position"); ax.grid(axis="y",color=GRID,alpha=.6)
    ax.set_title("Multivariable Metabolic Profiles\nEach line is one synthetic record; color shows simulator probability",loc="left",pad=18,color=SLATE)
    sm=plt.cm.ScalarMappable(cmap=cmap); sm.set_array(color_values)
    fig.colorbar(sm,ax=ax,shrink=.82,label="Simulator probability (%)")


def generate_cohort(n: int = 2500, seed: int = 42) -> pd.DataFrame:
    """Reproduce the project's diabetes training cohort equation and distributions."""
    rng = np.random.RandomState(seed)
    age = rng.uniform(20, 80, n)
    bmi = rng.normal(27.5, 5.5, n).clip(16, 50)
    glucose = rng.normal(105, 25, n).clip(65, 250)
    systolic = rng.normal(122, 16, n).clip(90, 200)
    activity = rng.uniform(0, 7, n)
    family = rng.choice([0, 1], size=n, p=[.65, .35])
    log_odds = (-1.4 + .045*(age-45) + .14*(bmi-25) + .06*(glucose-100)
                + .02*(systolic-120) - .22*(activity-3) + 1.15*family)
    probability = 1 / (1 + np.exp(-log_odds))
    outcome = (rng.uniform(0, 1, n) < probability).astype(int)
    return pd.DataFrame({"age": age, "bmi": bmi, "fasting_glucose": glucose,
                         "systolic_bp": systolic, "physical_activity_days": activity,
                         "family_history": family, "simulated_outcome": outcome,
                         "simulator_probability": probability})


def theme(fig, title: str, subtitle: str):
    fig.update_layout(
        title={"text": f"<b>{title}</b><br><sup>{subtitle}</sup>", "x": .045, "xanchor": "left"},
        font={"family": FONT, "color": SLATE, "size": 15},
        title_font={"size": 25, "color": SLATE}, paper_bgcolor="white", plot_bgcolor="white",
        margin={"l": 80, "r": 70, "t": 115, "b": 80}, hoverlabel={"bgcolor": "white", "font_size": 14},
        legend={"bgcolor": "rgba(255,255,255,.86)", "bordercolor": GRID, "borderwidth": 1},
    )
    fig.add_annotation(text="CAREPULSE  •  SYNTHETIC COHORT", x=1, y=1.11, xref="paper", yref="paper",
                       xanchor="right", showarrow=False, font={"size": 12, "color": TEAL})
    return fig


def build_figures(df: pd.DataFrame):
    FIGURES.mkdir(parents=True, exist_ok=True)
    # 3D view; outcome is a simulation label, not a diagnosis.
    plot = df.sample(1500, random_state=42)
    fig1 = px.scatter_3d(plot, x="age", y="bmi", z="fasting_glucose", color="simulated_outcome",
                         color_discrete_map={0: "#22D3EE", 1: "#D97706"}, opacity=.76,
                         hover_data={"systolic_bp": ":.0f", "physical_activity_days": ":.1f",
                                     "family_history": True, "simulator_probability": ":.1%"},
                         labels={"age":"Age (years)", "bmi":"BMI (kg/m²)", "fasting_glucose":"Fasting glucose (mg/dL)",
                                 "simulated_outcome":"Synthetic label"})
    theme(fig1, "Metabolic Profile — 3D Cohort View", "Age, BMI and fasting glucose; color marks the simulator-generated binary label")
    fig1.update_layout(legend_title_text="Simulated label", scene={
        "xaxis_title":"Age (years)", "yaxis_title":"BMI (kg/m²)", "zaxis_title":"Fasting glucose (mg/dL)",
        "bgcolor":"white", "camera":{"eye":{"x":1.55,"y":1.55,"z":1.15}},
        "xaxis":{"backgroundcolor":"white","gridcolor":GRID}, "yaxis":{"backgroundcolor":"white","gridcolor":GRID},
        "zaxis":{"backgroundcolor":"white","gridcolor":GRID}},
        dragmode="orbit", width=2400, height=1600)
    save_static_fallback(FIGURES / "01_interactive_3d_scatter.png", lambda canvas: draw_scatter_fallback(canvas, plot))

    # Surface is the exact logistic probability equation in the project's synthetic generator,
    # holding other inputs at cohort medians. It is expressly not a fitted clinical model.
    gx = np.linspace(70, 160, 55); by = np.linspace(18, 40, 48)
    xx, yy = np.meshgrid(gx, by)
    med = df.median(numeric_only=True)
    log_odds = (-1.4 + .045*(med.age-45) + .14*(yy-25) + .06*(xx-100)
                + .02*(med.systolic_bp-120) - .22*(med.physical_activity_days-3)
                + 1.15*med.family_history)
    zz = 1/(1+np.exp(-log_odds))*100
    fig2 = go.Figure(go.Surface(x=xx, y=yy, z=zz, colorscale=[[0,"#ECFEFF"],[.45,"#22D3EE"],[1,TEAL]],
                                colorbar={"title":"Simulator<br>probability (%)"},
                                hovertemplate="Glucose: %{x:.0f} mg/dL<br>BMI: %{y:.1f} kg/m²<br>Equation output: %{z:.1f}%<extra></extra>",
                                contours={"z":{"show":True,"usecolormap":True,"project_z":True}}))
    theme(fig2, "Synthetic Risk Equation — Response Surface", "Generator probability across glucose and BMI; remaining inputs fixed at cohort medians")
    fig2.update_layout(width=2400,height=1600,scene={"xaxis_title":"Fasting glucose (mg/dL)", "yaxis_title":"BMI (kg/m²)",
        "zaxis_title":"Simulator probability (%)", "bgcolor":"white", "camera":{"eye":{"x":1.5,"y":1.6,"z":1.1}},
        "xaxis":{"backgroundcolor":"white","gridcolor":GRID}, "yaxis":{"backgroundcolor":"white","gridcolor":GRID},
        "zaxis":{"backgroundcolor":"white","gridcolor":GRID}},dragmode="orbit")
    save_static_fallback(FIGURES / "02_interactive_3d_surface.png", lambda canvas: draw_surface_fallback(canvas, xx, yy, zz))

    cols = ["age", "bmi", "fasting_glucose", "systolic_bp", "physical_activity_days", "family_history"]
    labels = ["Age (years)", "BMI (kg/m²)", "Fasting glucose (mg/dL)", "Systolic BP (mmHg)", "Activity (days/week)", "Family history (0/1)"]
    corr = df[cols].corr()
    fig3 = go.Figure(go.Heatmap(z=corr.values, x=labels, y=labels, zmin=-1, zmax=1, zmid=0,
        colorscale=[[0,"#0E7490"],[.5,"#FFFFFF"],[1,"#D97706"]], text=np.round(corr.values,2), texttemplate="%{text:.2f}",
        hovertemplate="%{y}<br>%{x}<br>Pearson r: %{z:.3f}<extra></extra>", colorbar={"title":"Pearson r"}))
    theme(fig3, "Synthetic Cohort — Feature Correlation", "Pearson correlations among model input variables; correlation does not imply causation")
    fig3.update_layout(width=2400,height=1600, xaxis={"tickangle":-18,"side":"bottom"}, yaxis={"autorange":"reversed"},
                       margin={"l":220,"r":90,"t":120,"b":180})
    save_static_fallback(FIGURES / "03_advanced_heatmap.png", lambda canvas: draw_heatmap_fallback(canvas, corr, labels))

    norm = df[cols].copy()
    norm.columns = labels
    parallel_sample=norm.sample(1000,random_state=7)
    parallel_color=df.loc[parallel_sample.index,"simulator_probability"]*100
    fig4 = px.parallel_coordinates(parallel_sample, color=parallel_color,
        color_continuous_scale=[[0,"#22D3EE"],[.5,GREEN],[1,TEAL]], range_color=[0,100],
        labels={name:name for name in labels})
    theme(fig4, "Multivariable Metabolic Profiles", "Each polyline represents one synthetic record; color shows simulator probability")
    fig4.update_layout(width=2400,height=1600,coloraxis_colorbar={"title":"Simulator<br>probability (%)"})
    save_static_fallback(FIGURES / "04_additional_visualization.png",
                         lambda canvas: draw_parallel_fallback(canvas, parallel_sample, labels, parallel_color.to_numpy()))
    return [
        ("01_interactive_3d_scatter.png", "Metabolic Profile — 3D Cohort View", "Each point is a synthetic cohort record. Age, BMI and fasting glucose form the 3D axes; color distinguishes the generator's binary outcome label. Hover reveals additional features and the generating probability. This descriptive view does not establish clinical risk for real people.", "Age (years), BMI (kg/m²), fasting glucose (mg/dL); color: simulator-generated outcome."),
        ("02_interactive_3d_surface.png", "Synthetic Risk Equation — Response Surface", "The surface evaluates the logistic probability equation already used to generate the project's diabetes training cohort. Glucose and BMI vary; age, systolic pressure, activity and family history are held at synthetic-cohort medians. It illustrates the simulator only and is not a clinical prediction model.", "Fasting glucose (mg/dL), BMI (kg/m²); height and color: generator probability (%)."),
        ("03_advanced_heatmap.png", "Synthetic Cohort — Feature Correlation", "This Pearson correlation matrix summarizes pairwise linear association among the six diabetes-model inputs. Values near zero indicate weaker linear association within this generated sample; the matrix is descriptive and does not imply cause or effect.", "Age, BMI, fasting glucose, systolic BP, activity days/week and family history."),
        ("04_additional_visualization.png", "Multivariable Metabolic Profiles", "Parallel coordinates show the distribution of six input dimensions across a sample of synthetic records. Each line is one record; color maps to the data generator's probability. The plot supports interactive brushing in Plotly's source figure.", "Age, BMI, fasting glucose, systolic BP, activity, family history; color: simulator probability."),
    ]


def create_report(pages, df):
    pdf = OUT / "Plotly_Visualization_Report.pdf"
    doc = SimpleDocTemplate(str(pdf), pagesize=landscape(letter), rightMargin=.55*inch, leftMargin=.55*inch,
                            topMargin=.45*inch, bottomMargin=.5*inch, title="CarePulse Plotly Visualization Report")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24,
                              textColor=colors.HexColor(SLATE), alignment=TA_LEFT, spaceAfter=7))
    styles.add(ParagraphStyle(name="BodyCare", parent=styles["BodyText"], fontSize=11, leading=16,
                              textColor=colors.HexColor(MUTED), spaceAfter=7))
    story = [Paragraph("CarePulse | Interactive Plotly Visualization", styles["ReportTitle"]),
             Paragraph("<b>Prepared by</b><br/>Saksham Pathak — Reg. No. 26MCA1099<br/>Akshay Pandey — Reg. No. 26MCA1074", styles["BodyCare"]),
             Paragraph("Synthetic diabetes-model cohort • Reproducible seed: 42 • 2,500 records", styles["BodyCare"]),
             Paragraph("Data note: figures use the reproducible synthetic cohort generator already present in CarePulse. They do not contain patient records, validate a clinical model, or support individual medical decisions. Simulator outputs are labeled as such.", styles["BodyCare"]),
             Paragraph("Static submission: PNG and PDF figures do not support hover, orbit, zoom, or brushing. Those interactive controls are retained in the Plotly figure definitions in the Python source.", styles["BodyCare"]),
             Paragraph(f"Generated cohort label prevalence: {df.simulated_outcome.mean():.1%}. This is a property of this simulated sample only.", styles["BodyCare"]), PageBreak()]
    for i,(filename,title,desc,variables) in enumerate(pages):
        story += [Paragraph(title, styles["Heading1"]), Paragraph(desc, styles["BodyCare"]),
                  Paragraph(f"<b>Variables:</b> {variables}", styles["BodyCare"]), Spacer(1,6)]
        img = Image(str(FIGURES/filename), width=9.7*inch, height=5.1*inch, kind="proportional")
        story += [img]
        if i < len(pages)-1: story.append(PageBreak())
    def footer(canvas, _doc):
        canvas.saveState(); canvas.setStrokeColor(colors.HexColor(GRID)); canvas.line(.55*inch,.35*inch,10.45*inch,.35*inch)
        canvas.setFont("Helvetica",8); canvas.setFillColor(colors.HexColor(MUTED))
        canvas.drawString(.55*inch,.2*inch,"CAREPULSE  •  SYNTHETIC DATA • NOT FOR CLINICAL DECISION MAKING")
        canvas.drawRightString(10.45*inch,.2*inch,f"Page {_doc.page}"); canvas.restoreState()
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def main():
    OUT.mkdir(exist_ok=True); df=generate_cohort(); df.to_csv(OUT/"synthetic_diabetes_cohort.csv",index=False)
    pages=build_figures(df); create_report(pages,df)
    print(f"Generated {len(pages)} figures and report in {OUT}")


if __name__ == "__main__": main()
