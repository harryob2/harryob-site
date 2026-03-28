import pandas as pd
import numpy as np
import plotly.express as px
import dash
from dash import html, Dash, dcc, dash_table
from dash.dependencies import Input, Output, State
import dash_bootstrap_components as dbc
import dash_split_pane
import base64
import io
import datetime
from datetime import datetime
from pandas.tseries.offsets import BDay
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import gunicorn
import matplotlib.dates as md
from scipy.interpolate import interp1d


external_stylesheets = ["https://codepen.io/chriddyp/pen/bWLwgP.css"]

app = Dash(__name__, external_stylesheets=external_stylesheets, requests_pathname_prefix="/fyp/", routes_pathname_prefix="/fyp/")
server = app.server

columnNames = ["Blood Lactate", "Velocity (km/h)", "Stage Finish Time"]
resultsDF = pd.DataFrame(columns=columnNames)
resultsDF.rename_axis("Stage", inplace=True, axis=0)
columnIds = ["bloodLactate", "velocity", "stageFinishTime"]

# ------------------------------------------------------------------------

input_types = ['number', 'number', 'text']

row1 = html.Div(
    [
        dbc.Row([
            dbc.Col([
                html.Div([
                    html.P("Blood Lactate:", style={"margin-left":20}),
                    dcc.Input(
                            id="bloodLactateId",
                            type="number",
                            placeholder="insert Blood Lactate",
                            minLength=0, maxLength=50,
                            autoComplete='on',
                            disabled=False,
                            readOnly=False,
                            required=False,
                            size=20,
                            style={"margin-right":20}
                            )
                        ], style=
                         {
                            "display":"flex",
                            "justify-content":"space-between",
                            "align-items":"baseline",
                            "margin-top":20
                            }
            )
                ])

        ])

    ]
                    )

row2 = html.Div(
    [
        dbc.Row([
            dbc.Col([
    html.Div([
        html.P("Velocity (km/h):", style={"margin-left":20}),
        dcc.Input(
            id="velocityId",
            type="number",
            placeholder="insert Velocity",
            minLength=0, maxLength=50,
            autoComplete='on',
            disabled=False,
            readOnly=False,
            required=False,
            size="20",
            style={"margin-right":20}
        )
    ], style={
        "display":"flex",
        "justify-content":"space-between",
        "align-items":"baseline"})
]),

        ])

    ]
                    )

row3 = html.Div(
    [
        dbc.Row([
            dbc.Col([
                html.Div([
                    html.P("Stage Finish Time (MM:SS):",
                           style={"margin-left":20}),
                    dcc.Input(
            id="stageFinishTimeId",
            type="text",
            placeholder="insert (MM:SS)",
            minLength=0, maxLength=50,
            autoComplete='on',
            disabled=False,
            readOnly=False,
            required=False,
            size="20",
            style={"margin-right":20}
        )
    ], style={"display":"flex",
              "justify-content":"space-between",
              "align-items":"baseline"})
                ]),

        ])

    ]
                    )

row4 = html.Div([
        dbc.Row(
            html.Button('Add Row',
                        id='add_row',n_clicks=0),
            
            
        ),
        html.P('Already have Blood Lactate data ready?', style={"margin-top":60}),
        dcc.Upload(
            id='uploadBloodLactate', children=html.Div([
                'Drag and Drop Blood Lactate file or ', html.A('Select Files')
                ] ),
            style={
                'width':'80%',
                "lineHeight":"60px",
                'borderWidth':'1px',
                'borderStyle':'dashed',
                'borderRadius':'5px',
                'text-align':'center',
                'margin-left':'auto',
                'margin-right':'auto',
                }
            )
        

], style={"text-align":"center"})


row5 = html.Div([
        dcc.Upload(
            id="upload-data", children=html.Div([
                'Drag and Drop COSMED file or ', html.A('Select Files')
                ] ),
            style={
                'width':'80%',
                "lineHeight":"60px",
                'borderWidth':'1px',
                'borderStyle':'dashed',
                'borderRadius':'5px',
                'text-align':'center',
                'margin-left':'auto',
                'margin-right':'auto',
                'margin-top':10,
                }
            )

], style={"align-content":'center'})

row6 = html.Div([
    html.Label(['Just checking the software out? Find sample data ', 
                html.A('here', href='https://github.com/harryob2/Web-app-sample-data/tree/main/Athlete%20Data', target='_blank'), ' or'], 
               style={"margin-top":55}),
    html.Button('Click here to generate a report with sample data',
                id='sample_button',
                n_clicks=0),
    html.Label([html.A('Click here ', href='https://youtu.be/pgGwRGgJvQc', target='_blank'), 'to watch a tutorial video.'],
               style={"margin-top":8}),
    html.Button('Test (Developer use only)', id='test', n_clicks=0, style={"margin-top":200})

    ], style={'text-align':'center', 'vertical-align':'bottom'})


table = html.Div(children=[
dbc.Row([
        dbc.Col([html.H5('Results',
                         className='text-center',
                         style={"margin-left":20}),
        dash_table.DataTable(
                id='table-container_3',
                data=[],
                columns=[{"name":i_3,"id":i_3,'type':'numeric'} for i_3 in resultsDF.columns],
                style_table={'overflow':'scroll','height':600},
                style_cell={'textAlign':'center'},
                row_deletable=True,
                editable=True),


                ],width={'size':12,"offset":0,'order':1})
            ]), html.Div(id='output-plot')
 ])




global pane1
pane1 = html.Div([
    row1,
    html.Br(),
    row2,
    html.Br(),
    row3,
    html.Br(),
    row4,
    html.Br(),
    row5,
    html.Br(),
    row6
    ])

pane2 = html.Div(
    table,
    )



app.layout = dash_split_pane.DashSplitPane(
    children=[pane1, pane2],
    id="splitter",
    split="vertical",
    size=500
    )



@app.callback(
Output('table-container_3', 'data'),
Output('bloodLactateId', 'value'),
Output('velocityId', 'value'),
Output('stageFinishTimeId', 'value'),
Input('add_row', 'n_clicks'),
State('table-container_3', 'data'),
State('table-container_3', 'columns'),
State('bloodLactateId', 'value'),
State('velocityId', 'value'),
State('stageFinishTimeId', 'value')) 

def add_row(n_clicks, rows, columns, selectedBloodLactate, selectedVelocity,
            selectedStageFinishTime):

    if n_clicks > 0:
        rows.append({c['id']: r for c,r in zip(columns,
                                               [selectedBloodLactate,
                                                selectedVelocity,
                                                selectedStageFinishTime])})

    return rows, '', '', ''


def parse_contents_GUI(GUI_df_upload):
    content_type, content_string = GUI_df_upload.split(',')
    decoded = base64.b64decode(content_string)
    try:
        if 'csv' in content_type:
            GUI_df_upload = pd.read_csv(
                io.StringIO(decoded.decode('utf-8')))
        elif 'xls' in content_type:
            GUI_df_upload = pd.read_excel(io.BytesIO(decoded))
    except Exception as e:
        print(e)
        return html.Div([
            'There was an error processing this file.'
        ])
    return GUI_df_upload


def parse_contents_plot(HR_df, filename, GUI_df):
    global athlete_stats_df
    content_type, content_string = HR_df.split(',')

    decoded = base64.b64decode(content_string)

    try:
        if 'csv' in filename:
            # Assume that the user uploaded a CSV file
            COSMEDdf = pd.read_csv(
                io.StringIO(decoded.decode('utf-8')))
        elif 'xls' in filename:
            # Assume that the user uploaded an excel file
            COSMEDdf = pd.read_excel(io.BytesIO(decoded))
    except Exception as e:
        print(e)
        return html.Div([
            'There was an error processing this file.'
        ])

    athlete_stats_df, full_athlete_info_df = cleanTableFunc(COSMEDdf, GUI_df)
    pane2parse = pane2output(athlete_stats_df, full_athlete_info_df)

    return pane2parse



global GUI_df_upload
GUI_df_upload = pd.DataFrame()
@app.callback(
    Output('uploadBloodLactate', 'children'),
    Input('uploadBloodLactate', 'contents'),
    State('uploadBloodLactate', 'filename'),
    prevent_initial_call=True)
def bloodLactateUpload(contents, filename):
    if filename is not None:
        global GUI_df_upload
        GUI_df_upload = parse_contents_GUI(contents)
        children = html.Div(
            f'File {filename} uploaded successfully')
        return children


@app.callback(Output('splitter', 'children'), # change layout to output-plot
              Input('upload-data', 'contents'),
              Input('sample_button', 'n_clicks'),
              Input('test', 'n_clicks'),
              State('upload-data', 'filename'),
              State('table-container_3', 'data'), prevent_initial_call=True)
def update_plot(HR_df, n_clicks, test_n_clicks, filename, GUI_df):
    global pane1
    global athlete_stats_df
    global GUI_df_upload
    if n_clicks > 0:
        athlete_stats_data = [[1,10,148,37,1.1,'06:00'],
                [2,11,158,41,1.1,'09:00'],
                [3,12,167,44,1.3,'12:00'],
                [4,13,176,48,1.6,'15:00'],
                [5,14,180,51,1.9,'18:00'],
                [6,15,186,55,2.7,'21:00'],
                [7,16,189,57,3.8,'24:00'],
                [8,17,193,60,5.9,'27:00']]
        athlete_stats_df = pd.DataFrame(athlete_stats_data, columns = ['Stage', 'Velocity (km/h)', 'HR', 'VO2/Kg', 'Blood Lactate', 'Stage Finish Time'])
        
        full_athlete_info_data = [['SIMPSON', 'BART', 'M', 16, 171.5, 58, 19.72, 204, 63.95, 13.82, 1.82]]
        full_athlete_info_df = pd.DataFrame(full_athlete_info_data, columns = ['Last Name', 
                                                                               'First Name', 
                                                                               'Sex', 
                                                                               'Age', 
                                                                               'Height (cm)', 
                                                                               'Weight (kg)', 
                                                                               'BMI (Kg/m^2)',
                                                                               'Max HR',
                                                                               'Max VO2 (ml/kg)',
                                                                               'DMax Velocity (km/h)',
                                                                               'DMax Blood Lactate (mmol/L)'])
        
        pane2 = pane2output(athlete_stats_df, full_athlete_info_df)
        children = [pane1, pane2]
        return children

        
 
    
    elif test_n_clicks > 0: #this is used to test the app, automatically importing the data instead of having to manually add it everytime I want to test the code
        COSMEDdf = pd.read_csv(r"C:\Users\harry\OneDrive\Documents\college\fyp\athlete data\A002,A003,A004\Athlete Data\Athlete 1\COSMED Data.csv")
        GUI_df = pd.read_csv(r"C:\Users\harry\OneDrive\Documents\college\fyp\athlete data\A002,A003,A004\Athlete Data\Athlete 1\Blood Lactate Data.csv")
        GUI_df = GUI_df.drop('Stage', axis=1)
        
        athlete_stats_df, full_athlete_info_df = cleanTableFunc(COSMEDdf, GUI_df)
        pane2 = pane2output(athlete_stats_df, full_athlete_info_df)
        children = [pane1, pane2]
        
        return children
    
    elif not GUI_df_upload.empty:
        GUI_df_upload = GUI_df_upload.drop('Stage', axis=1)
        pane2 = parse_contents_plot(HR_df, filename, GUI_df_upload)
        children = [pane1, pane2]
        return children
    
    elif filename is not None:
        pane2 = parse_contents_plot(HR_df, filename, GUI_df)
        children = [pane1, pane2]

        return children


def col(title): #function for grabbing columns from athlete_stats_df
    global athlete_stats_df
    return athlete_stats_df[title]

def figFunc(col1, col2): # function for making figures
    figname = str(f"{col1} vs {col2} Fig")
    fig = make_subplots(specs=[[{"secondary_y": True}]])

    fig.add_trace(
        go.Scatter(x=col('Stage Finish Time'), y=col(f"{col1}"), name=f'{col1}', line_shape='spline'),
        secondary_y=False,
        )

    fig.add_trace(
        go.Scatter(x=col('Stage Finish Time'), y=col(f'{col2}'), name=f'{col2}', line_shape='spline'),
        secondary_y=True
        )

    # Add figure title
    fig.update_layout(
        title_text=figname
    )

    # Set y-axes titles
    fig.update_yaxes(title_text=f"{col1}", secondary_y=False)
    fig.update_yaxes(title_text=f"{col2}", secondary_y=True)

    return fig






def cleanTableFunc(HR_df, GUI_df): # function for making athlete_stats_df and athlete_info_df
    GUI_df = pd.DataFrame(GUI_df)
    GUI_df.index.name = 'Stage'
    GUI_df.reset_index(inplace=True)

    HR_df_clean = HR_df.drop([0, 1])
    HR_df_clean = HR_df_clean.reset_index(
        drop=True)  # the index numbers 1 and 2 get removed when I run the above line. I want to keep them,
    # otherwise it interferes with my ability to merge this dataframe with the other dataframe with the GUI data
    # later
    cols = np.r_[0:9, 25:30, 41:45, 46, 49:58, 64, 65, 70, 75:107, 109:117, 119, 121,
            125:128]  # these are all the columns with useless data in HR_df that I want to remove
    HR_df_cleaner = HR_df_clean.drop(HR_df_clean.columns[cols], axis=1)

    stage_list = ['Stage', '', '']
    stage_column = pd.DataFrame(stage_list)
    GUI_stage_rows = []
    GUI_velocity_rows = []
    GUI_blood_lactate_rows = []

    x = 0
    stage_change_index = [] 

    temp_i = 0
    print(GUI_df)
    while type(HR_df_cleaner.iloc[temp_i][0]) is str:
        hr_time = str(HR_df_cleaner.iloc[temp_i][0])
        print(hr_time)
        if datetime.strptime(hr_time, "%H:%M:%S") < datetime.strptime(
                GUI_df.iloc[len(GUI_df) - 1][3],
                "%M:%S"):  # discards all values taken after test was finished
            if x + 1 <= len(GUI_df):
                if datetime.strptime(hr_time, "%H:%M:%S") <= datetime.strptime(GUI_df.iloc[x][3],
                                                                                                "%M:%S"):
                    GUI_stage_rows.append(GUI_df.iloc[x][0])
                    GUI_velocity_rows.append(GUI_df.iloc[x][2])
                    GUI_blood_lactate_rows.append(GUI_df.iloc[x][1])
                else:
                    x += 1
                    stage_change_index.append(temp_i)
                    GUI_stage_rows.append(GUI_df.iloc[x][0])
                    GUI_velocity_rows.append(GUI_df.iloc[x][2])
                    GUI_blood_lactate_rows.append(GUI_df.iloc[x][1])

        temp_i += 1
        print(type(HR_df_cleaner.iloc[temp_i][0]))


    stage_df = pd.DataFrame({'Stage': GUI_stage_rows})
    velocity_df = pd.DataFrame({GUI_df.columns[2]: GUI_velocity_rows})

    blood_lactate_df = pd.DataFrame({'Blood Lactate': GUI_blood_lactate_rows})

    # make new dataframe with all of the data merged
    New_clean_df = pd.concat([HR_df_cleaner, stage_df, velocity_df, blood_lactate_df], axis=1)

    New_clean_df['HR'] = pd.to_numeric(New_clean_df['HR'])
    New_clean_df['VO2/Kg'] = pd.to_numeric(New_clean_df['VO2/Kg'])

    grouped = New_clean_df.groupby('Stage', as_index=False).apply(lambda x: x.tail(
        int(0.33 * len(x))))  # group dataframe by stage, then remove everything except the last third of the values
    grouped = grouped.groupby('Stage').mean(numeric_only=True)  # find the mean of all the numeric values

    athlete_stats_df = grouped.iloc[:, 0:2].join(GUI_df.iloc[:,
                                                    0:4])  # combine columns from 2 dataframes to create 1 dataframe
                                                        # with useful info for the report
    athlete_stats_df = athlete_stats_df.iloc[:,
                        [2, 4, 1, 0, 3, 5]]  # change the order of the columns to make it easier to understand

    athlete_stats_df.rename(columns={ athlete_stats_df.columns[2]: "HR" }, inplace = True)
    print(athlete_stats_df)
    
    athlete_stats_df['HR'] = round(pd.to_numeric(athlete_stats_df['HR'])) # round HR to integer
    athlete_stats_df['VO2/Kg'] = round(pd.to_numeric(athlete_stats_df['VO2/Kg']), 2) # round VO2/Kg to 2 decimal places
    athlete_stats_df = athlete_stats_df.drop(athlete_stats_df.index[0])     #drop the first row from athlete_stats_df

    # =============================================
    # VO2 Max
    # =============================================
    VO2_rolling_mean = New_clean_df['VO2/Kg'].rolling(5, min_periods=5).mean()
    VO2_rolling_mean.dropna(inplace=True)
    VO2_Max = round(max(VO2_rolling_mean), 2)

    # =============================================
    # DMax Method
    # =============================================
    perp_dist = []
    blood_lactate_array = np.squeeze(athlete_stats_df[['Blood Lactate']].to_numpy())
    velocity_array = np.squeeze(athlete_stats_df[['Velocity (km/h)']].to_numpy())
    xnew = np.linspace(velocity_array[0], velocity_array[-1])

    l = interp1d(velocity_array, blood_lactate_array, kind='cubic')

    for i in range((len(xnew))):
        p1 = (xnew[0], l(xnew[0]))      # make x and y coordinates for first point blood lactate curve
        p2 = (xnew[-1], l(xnew[-1]))    # last point on blood lactate curve
        p3 = (xnew[i], l(xnew[i]))      # point on blood lactate curve
                                        # we will use p1 and p2 to construct a straight line, and measure the
        p1 = np.asarray(p1)             # perpendicular distance between every point on the blood lactate curve
        p2 = np.asarray(p2)             # and this straight line. then we find the maximum perpendicular distance,
        p3 = np.asarray(p3)             # and this is the DMax point.
                                        # note: l is the blood lactate interpolated line function used for plots
        d = np.linalg.norm(np.cross(p2 - p1, p1 - p3)) / np.linalg.norm(p2 - p1)
        perp_dist.append(d)

    max_index = perp_dist.index(max(perp_dist))
    dmax_velocity = xnew[max_index]
    dmax_blood_lactate = l(xnew[max_index])



    # =============================================
    # Create Athlete Info Table
    # =============================================
    athlete_info_index = HR_df.iloc[0:6, 0]
    athlete_info_index2 = HR_df.iloc[5:7, 3]
    athlete_info = HR_df.iloc[0:6, 1]
    athlete_info2 = HR_df.iloc[5:7, 4]
    athlete_info_df = pd.DataFrame(athlete_info.values, index=athlete_info_index)
    athlete_info2_df = pd.DataFrame(athlete_info2.values, index=athlete_info_index2)
    full_athlete_info_df = pd.concat([athlete_info_df, athlete_info2_df])
    full_athlete_info_df.loc["VO2 Max"] = VO2_Max # add VO2 Max to table
    full_athlete_info_df.loc["DMax Velocity"] = dmax_velocity # add DMax power/velocity to table
    full_athlete_info_df.loc["DMax Blood Lactate"] = dmax_blood_lactate # add DMax blood lactate to table
    full_athlete_info_df.iloc[6,] = round(pd.to_numeric(full_athlete_info_df.iloc[6,]), 2) # round VO2 Max to 2 dp
    full_athlete_info_df.iloc[9,] = round(pd.to_numeric(full_athlete_info_df.iloc[9,]), 2) # round DMax velocity to 2 dp
    full_athlete_info_df.iloc[10,] = round(pd.to_numeric(full_athlete_info_df.iloc[10,]), 2) # round DMax blood lactate to 2 dp
    full_athlete_info_df = full_athlete_info_df.transpose() # transpose table so that it is easier to read
    

    return athlete_stats_df, full_athlete_info_df

    

def pane2output(athlete_stats_df, full_athlete_info_df):
    return html.Div([
                html.Div([
                    dash_table.DataTable(full_athlete_info_df.to_dict('records'), [{'name': i, 'id': i} for i in full_athlete_info_df.columns], style_table={'height': '100px', 'width': '90%'}),
                dash_table.DataTable(athlete_stats_df.to_dict('records'), [{'name': i, 'id': i} for i in athlete_stats_df.columns], style_table={'height': '300px', 'width': '90%'})
            ]),
        dcc.Graph(figure=figFunc('VO2/Kg', 'Blood Lactate')),
        dcc.Graph(figure=figFunc('Blood Lactate', 'Velocity (km/h)')),
        dcc.Graph(figure=figFunc('HR', 'VO2/Kg')),
        dcc.Graph(figure=figFunc('HR', 'Velocity (km/h)')),
        dcc.Graph(figure=figFunc('HR', 'Blood Lactate'))
        

    ], style={'height':'100%','overflow-y':'auto'})



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
